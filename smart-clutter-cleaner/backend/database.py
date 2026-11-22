"""Database engine, session factory and FastAPI dependency."""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    """FastAPI dependency yielding a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_connection() -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True


def init_db() -> None:
    """Create tables if they do not exist, and seed default settings."""
    import models  # noqa: F401  (registers tables on Base.metadata)

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        models.seed_default_settings(db)
