"""Dashboard endpoints: real disk usage (psutil) and a summary of the latest scan."""
from pathlib import Path

import psutil
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from database import get_db
from models import CleanupRecord, DuplicateGroup, Scan, ScannedFile, StorageReport

router = APIRouter(prefix="/api", tags=["dashboard"])

MB = 1024 ** 2
GB = 1024 ** 3
# Actions that actually free space on the scanned drive.
FREEING_ACTIONS = ("quarantine", "recycle_bin", "permanent_delete", "archive", "empty_folder_removed")
BUCKET_ORDER = ["< 1 MB", "1–10 MB", "10–100 MB", "100 MB–1 GB", "> 1 GB"]


@router.get("/system/disk")
def disk_usage():
    """Capacity of the drive that holds the user's home folder."""
    anchor = Path.home().anchor or "/"
    try:
        u = psutil.disk_usage(anchor)
    except OSError as exc:
        raise HTTPException(status_code=503, detail=f"Cannot read disk usage: {exc.strerror or exc}")
    return {"total": u.total, "used": u.used, "free": u.free, "percent": u.percent}


def _recommendations(db: Session, scan: Scan) -> list[dict]:
    recs: list[dict] = []

    dup_n, dup_size = db.execute(
        select(func.coalesce(func.sum(DuplicateGroup.file_count - 1), 0),
               func.coalesce(func.sum(DuplicateGroup.reclaimable_size), 0))
        .where(DuplicateGroup.scan_id == scan.id)
    ).one()
    if dup_n:
        recs.append({"id": "dup", "severity": "high", "title": "Remove duplicate files",
                     "detail": f"{int(dup_n):,} extra copies found", "size": int(dup_size), "route": "/duplicates"})

    for flag, rid, title, detail, route, sev in (
        (ScannedFile.is_old_download, "old", "Review old downloads", "files in Downloads you have not touched in a while", "/downloads", "medium"),
        (ScannedFile.is_temp, "tmp", "Clear temporary files", "temporary files that are normally safe to clean", "/cleanup", "low"),
        (ScannedFile.is_large, "big", "Archive large files", "files above your large-file threshold", "/large-files", "medium"),
    ):
        n, size = db.execute(
            select(func.count(ScannedFile.id), func.coalesce(func.sum(ScannedFile.size), 0))
            .where(ScannedFile.scan_id == scan.id, flag.is_(True))
        ).one()
        if n:
            recs.append({"id": rid, "severity": sev, "title": title, "detail": f"{n:,} {detail}",
                         "size": int(size), "route": route})
    return recs


@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    scan = db.scalars(
        select(Scan).where(Scan.status == "completed").order_by(Scan.id.desc()).limit(1)
    ).first()

    recent = db.scalars(select(Scan).order_by(Scan.id.desc()).limit(5)).all()
    recent_scans = [
        {"id": s.id, "status": s.status, "total_files": s.total_files, "total_size": s.total_size,
         "started_at": s.started_at.isoformat() if s.started_at else None, "roots": s.root_paths}
        for s in recent
    ]

    # Cleanup history is independent of any single scan.
    rows = db.execute(
        select(func.date(CleanupRecord.created_at), func.count(CleanupRecord.id),
               func.coalesce(func.sum(CleanupRecord.size), 0))
        .where(CleanupRecord.success.is_(True), CleanupRecord.action.in_(FREEING_ACTIONS))
        .group_by(func.date(CleanupRecord.created_at))
        .order_by(func.date(CleanupRecord.created_at))
    ).all()
    history, recovery, running = [], [], 0
    for day, files, size in rows:
        running += int(size)
        history.append({"date": str(day), "files": files, "bytes": int(size)})
        recovery.append({"date": str(day), "cumulative": running})

    summary = {
        "has_scan": scan is not None,
        "total_files": 0, "duplicate_files": 0, "large_files": 0, "potential_savings": 0,
        "by_type": [], "by_folder": [], "large_distribution": [],
        "cleanup_history": history, "recovery": recovery,
        "recent_scans": recent_scans, "recommendations": [],
    }
    if scan is None:
        return summary

    summary["total_files"] = scan.total_files
    summary["large_files"] = scan.large_count
    summary["potential_savings"] = scan.potential_savings
    summary["duplicate_files"] = db.scalar(
        select(func.coalesce(func.sum(DuplicateGroup.file_count - 1), 0)).where(DuplicateGroup.scan_id == scan.id)
    ) or 0

    summary["by_type"] = [
        {"name": cat, "size": int(size), "count": count}
        for cat, size, count in db.execute(
            select(ScannedFile.category, func.sum(ScannedFile.size), func.count(ScannedFile.id))
            .where(ScannedFile.scan_id == scan.id).group_by(ScannedFile.category)
            .order_by(func.sum(ScannedFile.size).desc())
        ).all()
    ]

    bucket = case(
        (ScannedFile.size < 1 * MB, BUCKET_ORDER[0]),
        (ScannedFile.size < 10 * MB, BUCKET_ORDER[1]),
        (ScannedFile.size < 100 * MB, BUCKET_ORDER[2]),
        (ScannedFile.size < 1 * GB, BUCKET_ORDER[3]),
        else_=BUCKET_ORDER[4],
    )
    counts = dict(db.execute(
        select(bucket, func.count(ScannedFile.id)).where(ScannedFile.scan_id == scan.id).group_by(bucket)
    ).all())
    summary["large_distribution"] = [{"bucket": b, "count": counts.get(b, 0)} for b in BUCKET_ORDER]

    # Folder totals are computed by the scanner (Phase 3) and stored on the report.
    report = db.scalars(
        select(StorageReport).where(StorageReport.scan_id == scan.id).order_by(StorageReport.id.desc()).limit(1)
    ).first()
    if report and report.by_folder:
        summary["by_folder"] = [{"name": k, "size": v} for k, v in report.by_folder.items()]

    summary["recommendations"] = _recommendations(db, scan)
    return summary
