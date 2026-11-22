"""Smart Digital Clutter Cleaner - FastAPI entry point.

Run from the backend/ folder:  uvicorn main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import check_connection, init_db
from routers import dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # creates tables + default settings on first run
    yield


app = FastAPI(title="Smart Digital Clutter Cleaner", version="0.1.0", lifespan=lifespan)

# The API is local-only; restrict browsers to the configured frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    try:
        check_connection()
        return {"status": "ok", "database": "connected"}
    except Exception as exc:  # surface a clear error instead of a 500 stack trace
        return {"status": "degraded", "database": "unreachable", "detail": str(exc.__class__.__name__)}
