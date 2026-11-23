"""SQLAlchemy models. Only metadata and paths are stored, never file contents."""
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer,
    JSON, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, Session

from database import Base

# MySQL index-length safe path column (utf8mb4: 4 bytes/char)
PATH_LEN = 1024


class User(Base):
    """Optional: only used if authentication is enabled later."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    root_paths: Mapped[list] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("running", "paused", "completed", "cancelled", "failed", name="scan_status"),
        default="running", nullable=False,
    )
    total_files: Mapped[int] = mapped_column(Integer, default=0)
    total_size: Mapped[int] = mapped_column(BigInteger, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, default=0)
    large_count: Mapped[int] = mapped_column(Integer, default=0)
    potential_savings: Mapped[int] = mapped_column(BigInteger, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    files = relationship("ScannedFile", back_populates="scan", cascade="all, delete-orphan")
    groups = relationship("DuplicateGroup", back_populates="scan", cascade="all, delete-orphan")


class DuplicateGroup(Base):
    __tablename__ = "duplicate_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    file_count: Mapped[int] = mapped_column(Integer, nullable=False)
    reclaimable_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    scan = relationship("Scan", back_populates="groups")
    files = relationship("ScannedFile", back_populates="group")

    __table_args__ = (Index("ix_dupgroups_scan_hash", "scan_id", "sha256"),)


class ScannedFile(Base):
    __tablename__ = "scanned_files"

    # BIGINT on MySQL; plain INTEGER on SQLite so autoincrement works in tests.
    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    group_id: Mapped[int | None] = mapped_column(
        ForeignKey("duplicate_groups.id", ondelete="SET NULL"), nullable=True
    )
    path: Mapped[str] = mapped_column(String(PATH_LEN), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    extension: Mapped[str] = mapped_column(String(32), default="")
    category: Mapped[str] = mapped_column(String(32), default="other")
    size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    modified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_large: Mapped[bool] = mapped_column(Boolean, default=False)
    is_old_download: Mapped[bool] = mapped_column(Boolean, default=False)
    is_temp: Mapped[bool] = mapped_column(Boolean, default=False)

    scan = relationship("Scan", back_populates="files")
    group = relationship("DuplicateGroup", back_populates="files")

    __table_args__ = (
        Index("ix_files_scan", "scan_id"),
        Index("ix_files_scan_size", "scan_id", "size"),
        Index("ix_files_scan_category", "scan_id", "category"),
        Index("ix_files_sha", "sha256"),
        Index("ix_files_path", "path", mysql_length=255),
    )


class CleanupRecord(Base):
    __tablename__ = "cleanup_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[int | None] = mapped_column(
        ForeignKey("scans.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(
        Enum("quarantine", "recycle_bin", "restore", "permanent_delete", "archive",
             "empty_folder_removed", name="cleanup_action"),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(32), default="manual")
    original_path: Mapped[str] = mapped_column(String(PATH_LEN), nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, default=0)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (Index("ix_cleanup_created", "created_at"),)


class QuarantinedFile(Base):
    __tablename__ = "quarantined_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    original_path: Mapped[str] = mapped_column(String(PATH_LEN), nullable=False)
    quarantine_path: Mapped[str] = mapped_column(String(PATH_LEN), nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, default=0)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reason: Mapped[str] = mapped_column(String(64), default="manual")
    status: Mapped[str] = mapped_column(
        Enum("quarantined", "restored", "deleted", name="quarantine_status"),
        default="quarantined", nullable=False,
    )
    quarantined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (Index("ix_quar_status", "status"),)


class StorageReport(Base):
    __tablename__ = "storage_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[int | None] = mapped_column(
        ForeignKey("scans.id", ondelete="SET NULL"), nullable=True
    )
    disk_total: Mapped[int] = mapped_column(BigInteger, default=0)
    disk_used: Mapped[int] = mapped_column(BigInteger, default=0)
    disk_free: Mapped[int] = mapped_column(BigInteger, default=0)
    by_type: Mapped[dict] = mapped_column(JSON, default=dict)
    by_folder: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class UserSetting(Base):
    """Key/value settings store (JSON values)."""
    __tablename__ = "user_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class ScanExclusion(Base):
    __tablename__ = "scan_exclusions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(
        Enum("folder", "extension", name="exclusion_kind"), nullable=False
    )
    value: Mapped[str] = mapped_column(String(PATH_LEN), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (Index("ix_excl_kind", "kind", "value", mysql_length={"value": 255}),)


DEFAULT_SETTINGS = {
    "scan_locations": [],
    "large_file_threshold_mb": 500,
    "old_download_days": 90,
    "theme": "light",
    "ai_enabled": False,
    "ai_model": "llama3.2",
    "cleanup_mode": "quarantine",   # quarantine | recycle_bin
    "confirm_before_cleanup": True,
}


def seed_default_settings(db: Session) -> None:
    existing = {row.key for row in db.query(UserSetting.key).all()}
    for key, value in DEFAULT_SETTINGS.items():
        if key not in existing:
            db.add(UserSetting(key=key, value=value))
    db.commit()
