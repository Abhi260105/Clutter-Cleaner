"""Functional discovery, quarantine, history, analytics and settings APIs."""
from collections import defaultdict
from datetime import datetime, timedelta
from hashlib import sha256
from pathlib import Path
import os
import shutil

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from database import get_db
from models import (Scan, ScannedFile, DuplicateGroup, CleanupRecord,
                    QuarantinedFile, StorageReport, UserSetting)

router = APIRouter(prefix="/api/features", tags=["file features"])


def latest_scan(db: Session):
    scan = db.scalars(select(Scan).where(Scan.status == "completed").order_by(Scan.id.desc()).limit(1)).first()
    if not scan:
        raise HTTPException(404, "No completed scan found. Run Smart Scanner first.")
    return scan


def file_json(f):
    return {"id": f.id, "name": f.name, "path": f.path, "extension": f.extension,
            "category": f.category, "size": f.size,
            "modified_at": f.modified_at.isoformat() if f.modified_at else None,
            "sha256": f.sha256, "is_large": f.is_large,
            "is_old_download": f.is_old_download, "is_temp": f.is_temp}


@router.get("/files/{kind}")
def discover_files(kind: str, db: Session = Depends(get_db)):
    scan = latest_scan(db)
    q = select(ScannedFile).where(ScannedFile.scan_id == scan.id)
    if kind == "large":
        q = q.where(ScannedFile.is_large.is_(True)).order_by(ScannedFile.size.desc())
    elif kind == "old":
        q = q.where(ScannedFile.is_old_download.is_(True)).order_by(ScannedFile.modified_at.asc())
    elif kind == "temporary":
        q = q.where(ScannedFile.is_temp.is_(True)).order_by(ScannedFile.size.desc())
    elif kind == "cleanup":
        q = q.where((ScannedFile.is_temp.is_(True)) | (ScannedFile.is_old_download.is_(True)) | (ScannedFile.is_large.is_(True))).order_by(ScannedFile.size.desc())
    elif kind == "similar":
        q = q.order_by(ScannedFile.name.asc())
    else:
        raise HTTPException(404, "Unknown file category")
    rows = db.scalars(q.limit(2000)).all()
    if kind == "similar":
        groups = defaultdict(list)
        for f in rows:
            groups[Path(f.name).stem.lower()].append(f)
        rows = [f for group in groups.values() if len(group) > 1 for f in group]
    return {"scan_id": scan.id, "count": len(rows), "files": [file_json(f) for f in rows]}


@router.post("/duplicates/analyze")
def analyze_duplicates(db: Session = Depends(get_db)):
    scan = latest_scan(db)
    candidates = db.scalars(select(ScannedFile).where(ScannedFile.scan_id == scan.id).order_by(ScannedFile.size)).all()
    by_size = defaultdict(list)
    for f in candidates:
        by_size[f.size].append(f)
    db.query(DuplicateGroup).filter(DuplicateGroup.scan_id == scan.id).delete(synchronize_session=False)
    db.query(ScannedFile).filter(ScannedFile.scan_id == scan.id).update({ScannedFile.group_id: None, ScannedFile.sha256: None}, synchronize_session=False)
    groups_found = 0
    savings_total = 0
    for size, files in by_size.items():
        if len(files) < 2:
            continue
        by_hash = defaultdict(list)
        for f in files:
            try:
                digest = sha256()
                with open(f.path, "rb") as stream:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                        digest.update(chunk)
                f.sha256 = digest.hexdigest()
                by_hash[f.sha256].append(f)
            except OSError:
                continue
        for digest, matches in by_hash.items():
            if len(matches) < 2:
                continue
            group = DuplicateGroup(scan_id=scan.id, sha256=digest, file_size=size,
                                   file_count=len(matches), reclaimable_size=size * (len(matches)-1))
            db.add(group); db.flush()
            savings_total += group.reclaimable_size
            for f in matches:
                f.group_id = group.id
            groups_found += 1
    scan.duplicate_count = groups_found
    scan.potential_savings = savings_total
    db.commit()
    return {"scan_id": scan.id, "groups": groups_found, "potential_savings": scan.potential_savings}


@router.get("/duplicates")
def duplicates(db: Session = Depends(get_db)):
    scan = latest_scan(db)
    groups = db.scalars(select(DuplicateGroup).where(DuplicateGroup.scan_id == scan.id).order_by(DuplicateGroup.reclaimable_size.desc())).all()
    result = []
    for g in groups:
        files = db.scalars(select(ScannedFile).where(ScannedFile.group_id == g.id)).all()
        result.append({"id": g.id, "sha256": g.sha256, "file_count": g.file_count,
                       "file_size": g.file_size, "reclaimable_size": g.reclaimable_size,
                       "files": [file_json(f) for f in files]})
    return {"scan_id": scan.id, "count": len(result), "groups": result}


class FileAction(BaseModel):
    file_id: int
    reason: str = Field(default="manual", max_length=64)


def safe_quarantine(file: ScannedFile, scan: Scan, db: Session, reason="manual"):
    source = Path(file.path).resolve(strict=True)
    roots = [Path(p).resolve() for p in (scan.root_paths or [])]
    if not any(os.path.commonpath([str(root), str(source)]) == str(root) for root in roots):
        raise HTTPException(400, "File is outside the scanned folder")
    if not source.is_file():
        raise HTTPException(400, "File no longer exists")
    quarantine_dir = roots[0] / ".smart-clutter-quarantine"
    quarantine_dir.mkdir(exist_ok=True)
    target = quarantine_dir / f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{source.name}"
    size = source.stat().st_size
    digest = file.sha256
    shutil.move(str(source), str(target))
    q = QuarantinedFile(original_path=str(source), quarantine_path=str(target), size=size, sha256=digest, reason=reason)
    db.add(q)
    db.add(CleanupRecord(scan_id=scan.id, action="quarantine", category=reason, original_path=str(source), size=size, success=True))
    return q


@router.post("/quarantine")
def quarantine_file(payload: FileAction, db: Session = Depends(get_db)):
    f = db.get(ScannedFile, payload.file_id)
    if not f:
        raise HTTPException(404, "Scanned file not found")
    scan = db.get(Scan, f.scan_id)
    try:
        q = safe_quarantine(f, scan, db, payload.reason)
        db.delete(f)  # Remove the stale scan entry after the file is safely moved.
        db.commit()
        return {"id": q.id, "status": q.status, "original_path": q.original_path}
    except Exception:
        db.rollback(); raise


@router.get("/quarantine")
def list_quarantine(db: Session = Depends(get_db)):
    rows = db.scalars(select(QuarantinedFile).order_by(QuarantinedFile.quarantined_at.desc())).all()
    return [{"id": q.id, "name": Path(q.original_path).name, "original_path": q.original_path,
             "quarantine_path": q.quarantine_path, "size": q.size, "status": q.status,
             "reason": q.reason, "quarantined_at": q.quarantined_at.isoformat() if q.quarantined_at else None} for q in rows]


@router.post("/quarantine/{qid}/restore")
def restore_quarantine(qid: int, db: Session = Depends(get_db)):
    q = db.get(QuarantinedFile, qid)
    if not q or q.status != "quarantined":
        raise HTTPException(404, "Active quarantined file not found")
    source, target = Path(q.quarantine_path), Path(q.original_path)
    if not source.is_file():
        raise HTTPException(404, "Quarantined file is missing")
    if target.exists():
        raise HTTPException(409, "Original path already exists; move or rename it before restoring")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(target))
    q.status = "restored"; q.resolved_at = datetime.now()
    db.add(CleanupRecord(action="restore", category=q.reason, original_path=q.original_path, size=q.size, success=True))
    db.commit()
    return {"status": "restored", "path": str(target)}


@router.get("/history")
def history(db: Session = Depends(get_db)):
    scans = db.scalars(select(Scan).order_by(Scan.id.desc()).limit(100)).all()
    actions = db.scalars(select(CleanupRecord).order_by(CleanupRecord.id.desc()).limit(100)).all()
    return {"scans": [{"id": s.id, "status": s.status, "roots": s.root_paths, "files": s.total_files,
                        "size": s.total_size, "duplicates": s.duplicate_count,
                        "started_at": s.started_at.isoformat() if s.started_at else None} for s in scans],
            "actions": [{"id": a.id, "action": a.action, "path": a.original_path, "size": a.size,
                         "success": a.success, "created_at": a.created_at.isoformat() if a.created_at else None} for a in actions]}


@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    scan = latest_scan(db)
    report = db.scalars(select(StorageReport).where(StorageReport.scan_id == scan.id).order_by(StorageReport.id.desc()).limit(1)).first()
    rows = db.execute(select(ScannedFile.category, func.count(ScannedFile.id), func.sum(ScannedFile.size))
                       .where(ScannedFile.scan_id == scan.id).group_by(ScannedFile.category)).all()
    return {"scan_id": scan.id, "total_files": scan.total_files, "total_size": scan.total_size,
            "categories": [{"category": r[0], "count": r[1], "size": r[2] or 0} for r in rows],
            "folders": [{"path": k, "size": v} for k, v in (report.by_folder or {}).items()] if report else [],
            "large_files": scan.large_count, "duplicates": scan.duplicate_count,
            "potential_savings": scan.potential_savings}


@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    return {row.key: row.value for row in db.scalars(select(UserSetting)).all()}


@router.put("/settings")
def update_settings(payload: dict, db: Session = Depends(get_db)):
    allowed = {"large_file_threshold_mb", "old_download_days", "theme", "ai_enabled", "ai_model", "cleanup_mode", "confirm_before_cleanup", "scan_locations"}
    for key, value in payload.items():
        if key not in allowed:
            continue
        row = db.get(UserSetting, key)
        if row: row.value = value
        else: db.add(UserSetting(key=key, value=value))
    db.commit()
    return get_settings(db)


@router.get("/ai-categorize")
def ai_categorize(db: Session = Depends(get_db)):
    """Rule-based local suggestions; no external AI or file upload is performed."""
    scan = latest_scan(db)
    rows = db.scalars(select(ScannedFile).where(ScannedFile.scan_id == scan.id).order_by(ScannedFile.size.desc()).limit(500)).all()
    suggestions = [{"name": f.name, "path": f.path, "category": f.category,
                    "suggested_folder": f.category.title(), "size": f.size} for f in rows]
    return {"mode": "local_rules", "note": "Extension-based suggestions, not an AI model prediction.", "suggestions": suggestions}
