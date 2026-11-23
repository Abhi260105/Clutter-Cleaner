"""Read-only local folder scanner. It stores file metadata, never file contents."""
from datetime import datetime, timedelta
from pathlib import Path
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from database import get_db
from models import Scan, ScannedFile, StorageReport

router = APIRouter(prefix="/api/scans", tags=["scanner"])
MB = 1024 ** 2
LARGE_FILE_BYTES = 500 * MB
OLD_DAYS = 90
TEMP_EXTENSIONS = {".tmp", ".temp", ".log", ".cache", ".bak"}
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


def category_for(ext: str) -> str:
    for category, extensions in CATEGORY_MAP.items():
        if ext in extensions:
            return category
    return "other"


@router.post("")
def start_scan(payload: ScanRequest, db: Session = Depends(get_db)):
    """Scan one existing folder synchronously; suitable for small/medium folders."""
    root = Path(payload.folder_path).expanduser()
    try:
        root = root.resolve(strict=True)
    except (OSError, RuntimeError):
        raise HTTPException(status_code=400, detail="Folder does not exist or cannot be accessed")
    if not root.is_dir():
        raise HTTPException(status_code=400, detail="The selected path is not a folder")

    scan = Scan(root_paths=[str(root)], status="running")
    db.add(scan); db.commit(); db.refresh(scan)
    now = datetime.now()
    cutoff = now - timedelta(days=OLD_DAYS)
    total_size = total_files = large_count = errors = 0
    by_type, by_folder = {}, {}
    batch = []
    try:
        for current, dirs, filenames in os.walk(root, topdown=True, onerror=lambda _e: None):
            # Avoid traversing common system/dependency folders.
            dirs[:] = [d for d in dirs if d.lower() not in {"$recycle.bin", "system volume information", "node_modules", ".git"}]
            for filename in filenames:
                path = Path(current) / filename
                try:
                    stat = path.stat()
                    if not path.is_file():
                        continue
                    ext = path.suffix.lower()[:32]
                    modified = datetime.fromtimestamp(stat.st_mtime)
                    size = int(stat.st_size)
                    is_download = "downloads" in {part.lower() for part in path.parts}
                    is_old = is_download and modified < cutoff
                    is_temp = ext in TEMP_EXTENSIONS or filename.startswith("~$")
                    is_large = size >= LARGE_FILE_BYTES
                    category = category_for(ext)
                    batch.append(ScannedFile(
                        scan_id=scan.id, path=str(path)[:1024], name=filename[:255],
                        extension=ext, category=category, size=size, modified_at=modified,
                        is_large=is_large, is_old_download=is_old, is_temp=is_temp,
                    ))
                    total_files += 1; total_size += size
                    large_count += int(is_large)
                    by_type[category] = by_type.get(category, 0) + size
                    folder = str(path.parent)
                    by_folder[folder] = by_folder.get(folder, 0) + size
                    if len(batch) >= 500:
                        db.add_all(batch); db.commit(); batch.clear()
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
        disk = __import__("psutil").disk_usage(str(root.anchor or root))
        db.add(StorageReport(scan_id=scan.id, disk_total=disk.total, disk_used=disk.used,
                             disk_free=disk.free, by_type=by_type,
                             by_folder=dict(sorted(by_folder.items(), key=lambda x: x[1], reverse=True)[:20])))
        db.commit()
    except Exception:
        db.rollback()
        scan = db.get(Scan, scan.id)
        if scan:
            scan.status = "failed"; scan.finished_at = datetime.now(); db.commit()
        raise
    return {"id": scan.id, "status": scan.status, "total_files": total_files,
            "total_size": total_size, "large_files": large_count, "error_count": errors,
            "message": "Scan completed. No files were changed."}


@router.get("/{scan_id}")
def get_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"id": scan.id, "status": scan.status, "roots": scan.root_paths,
            "total_files": scan.total_files, "total_size": scan.total_size,
            "large_files": scan.large_count, "error_count": scan.error_count,
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "finished_at": scan.finished_at.isoformat() if scan.finished_at else None}


@router.get("/{scan_id}/files")
def get_scan_files(scan_id: int, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    if not db.get(Scan, scan_id):
        raise HTTPException(status_code=404, detail="Scan not found")
    limit = max(1, min(limit, 500))
    rows = db.scalars(select(ScannedFile).where(ScannedFile.scan_id == scan_id)
                      .order_by(ScannedFile.size.desc()).offset(offset).limit(limit)).all()
    return [{"id": f.id, "name": f.name, "path": f.path, "extension": f.extension,
             "category": f.category, "size": f.size,
             "modified_at": f.modified_at.isoformat() if f.modified_at else None,
             "is_large": f.is_large, "is_old_download": f.is_old_download, "is_temp": f.is_temp}
            for f in rows]
