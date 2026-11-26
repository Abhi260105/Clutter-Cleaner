"""Read-only local folder scanner. Stores file metadata, never file contents."""
from datetime import datetime, timedelta
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Scan, ScannedFile, StorageReport, UserSetting

router = APIRouter(prefix="/api/scans", tags=["scanner"])
MB = 1024 ** 2
LARGE_FILE_BYTES = 500 * MB
OLD_DAYS = 90
TEMP_EXTENSIONS = {".tmp", ".temp", ".log", ".cache", ".bak"}
SKIP_DIRECTORIES = {
    "$recycle.bin", "system volume information", "node_modules", ".git",
    ".venv", "venv", "__pycache__", ".smart-clutter-quarantine",
}
CATEGORY_MAP = {
    "images": {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".heic"},
    "videos": {".mp4", ".mkv", ".mov", ".avi", ".webm"},
    "audio": {".mp3", ".wav", ".aac", ".flac", ".m4a"},
    "documents": {".pdf", ".doc", ".docx", ".txt", ".rtf", ".xls", ".xlsx", ".ppt", ".pptx"},
    "archives": {".zip", ".rar", ".7z", ".tar", ".gz"},
    "applications": {".exe", ".msi", ".apk", ".dmg", ".deb"},
}


class ScanRequest(BaseModel):
    folder_path: str = Field(min_length=1, max_length=1024)


def category_for(extension: str) -> str:
    for category, extensions in CATEGORY_MAP.items():
        if extension in extensions:
            return category
    return "other"


@router.get("/select-folder")
def select_folder():
    """Open a native folder picker on the computer running this local backend."""
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected = filedialog.askdirectory(title="Select a folder to scan", mustexist=True)
        root.destroy()
        if not selected:
            return {"cancelled": True, "folder_path": ""}
        return {"cancelled": False, "folder_path": str(Path(selected).resolve())}
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="The native folder picker is unavailable. Enter the folder path manually.",
        ) from exc


@router.post("")
def start_scan(payload: ScanRequest, db: Session = Depends(get_db)):
    """Scan one existing folder synchronously; files are never modified."""
    try:
        root = Path(payload.folder_path.strip()).expanduser().resolve(strict=True)
    except (OSError, RuntimeError):
        raise HTTPException(status_code=400, detail="Folder does not exist or cannot be accessed")

    if not root.is_dir():
        raise HTTPException(status_code=400, detail="The selected path is not a folder")

    scan = Scan(root_paths=[str(root)], status="running")
    db.add(scan)
    db.commit()
    db.refresh(scan)

    saved_settings = {row.key: row.value for row in db.query(UserSetting).all()}
    large_threshold_mb = int(saved_settings.get("large_file_threshold_mb", 500))
    old_days = int(saved_settings.get("old_download_days", OLD_DAYS))
    cutoff = datetime.now() - timedelta(days=old_days)
    total_size = total_files = large_count = old_count = temp_count = errors = 0
    by_type, by_folder, batch = {}, {}, []

    def record_walk_error(_error):
        nonlocal errors
        errors += 1

    try:
        for current, dirs, filenames in os.walk(
            root, topdown=True, followlinks=False, onerror=record_walk_error
        ):
            dirs[:] = [
                directory for directory in dirs
                if directory.lower() not in SKIP_DIRECTORIES
                and not (Path(current) / directory).is_symlink()
            ]

            for filename in filenames:
                path = Path(current) / filename
                try:
                    if path.is_symlink() or not path.is_file():
                        continue
                    stat = path.stat()
                    modified = datetime.fromtimestamp(stat.st_mtime)
                    size = int(stat.st_size)
                    extension = path.suffix.lower()[:32]
                    is_download = any(part.lower() == "downloads" for part in path.parts)
                    is_old = is_download and modified < cutoff
                    is_temp = extension in TEMP_EXTENSIONS or filename.startswith("~$")
                    is_large = size >= max(1, large_threshold_mb) * MB
                    category = category_for(extension)
                    full_path = str(path)

                    # Do not save a truncated path: it would no longer identify the real file.
                    if len(full_path) > 1024:
                        errors += 1
                        continue

                    batch.append(ScannedFile(
                        scan_id=scan.id,
                        path=full_path,
                        name=filename[:255],
                        extension=extension,
                        category=category,
                        size=size,
                        modified_at=modified,
                        is_large=is_large,
                        is_old_download=is_old,
                        is_temp=is_temp,
                    ))
                    total_files += 1
                    total_size += size
                    large_count += int(is_large)
                    old_count += int(is_old)
                    temp_count += int(is_temp)
                    by_type[category] = by_type.get(category, 0) + size
                    folder = str(path.parent)
                    by_folder[folder] = by_folder.get(folder, 0) + size

                    if len(batch) >= 500:
                        db.add_all(batch)
                        db.commit()
                        batch.clear()
                except (OSError, PermissionError):
                    errors += 1

        if batch:
            db.add_all(batch)

        scan.total_files = total_files
        scan.total_size = total_size
        scan.large_count = large_count
        scan.error_count = errors
        scan.status = "completed"
        scan.finished_at = datetime.now()

        try:
            import psutil
            disk = psutil.disk_usage(str(root.anchor or root))
            db.add(StorageReport(
                scan_id=scan.id,
                disk_total=disk.total,
                disk_used=disk.used,
                disk_free=disk.free,
                by_type=by_type,
                by_folder=dict(sorted(by_folder.items(), key=lambda item: item[1], reverse=True)[:20]),
            ))
        except (OSError, ValueError):
            # A disk usage failure should not discard otherwise valid scan results.
            pass

        db.commit()
    except Exception:
        db.rollback()
        failed_scan = db.get(Scan, scan.id)
        if failed_scan:
            failed_scan.status = "failed"
            failed_scan.finished_at = datetime.now()
            db.commit()
        raise

    return {
        "id": scan.id,
        "status": scan.status,
        "root_path": str(root),
        "total_files": total_files,
        "total_size": total_size,
        "large_files": large_count,
        "old_downloads": old_count,
        "temporary_files": temp_count,
        "error_count": errors,
        "message": "Scan completed. No files were changed.",
    }


@router.get("/{scan_id}")
def get_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {
        "id": scan.id,
        "status": scan.status,
        "roots": scan.root_paths,
        "total_files": scan.total_files,
        "total_size": scan.total_size,
        "large_files": scan.large_count,
        "error_count": scan.error_count,
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
        "finished_at": scan.finished_at.isoformat() if scan.finished_at else None,
    }


@router.get("/{scan_id}/files")
def get_scan_files(scan_id: int, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    if not db.get(Scan, scan_id):
        raise HTTPException(status_code=404, detail="Scan not found")
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    rows = db.scalars(
        select(ScannedFile)
        .where(ScannedFile.scan_id == scan_id)
        .order_by(ScannedFile.size.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [
        {
            "id": file.id,
            "name": file.name,
            "path": file.path,
            "extension": file.extension,
            "category": file.category,
            "size": file.size,
            "modified_at": file.modified_at.isoformat() if file.modified_at else None,
            "is_large": file.is_large,
            "is_old_download": file.is_old_download,
            "is_temp": file.is_temp,
        }
        for file in rows
    ]
