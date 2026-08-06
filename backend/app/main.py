import logging
import mimetypes

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.exc import DataError, IntegrityError

logger = logging.getLogger(__name__)

from app.config import settings
from app.database import SessionLocal
from app.routers import activity, plans, attachments, inbox, kb, notes, profile, recurring, sprints, stats, tags, tasks, templates, time
from app.routers.recurring import run_recurring_generation

app = FastAPI(title="Personal Command Center API", version="1.0.0")


@app.on_event("startup")
def _generate_due_recurring_tasks() -> None:
    db = SessionLocal()
    try:
        run_recurring_generation(db)
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploaded files are attacker-influenced content served from the app's own
# origin. A bare StaticFiles mount would render an uploaded .html/.svg inline,
# letting it run JavaScript against the app. Serve through a guarded route
# instead: never sniff, and only display a safelist of raster images inline —
# everything else downloads.
INLINE_SAFE_TYPES = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


@app.get("/attachments/{stored_name}")
def serve_attachment(stored_name: str):
    root = settings.attachments_path.resolve()
    target = (root / stored_name).resolve()

    # Containment check — the stored name is generated server-side, but never
    # trust a path that reaches the filesystem.
    if not target.is_relative_to(root) or not target.is_file():
        raise HTTPException(404, "Attachment not found")

    suffix = target.suffix.lower()
    inline = suffix in INLINE_SAFE_TYPES
    headers = {
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": f'{"inline" if inline else "attachment"}; filename="{target.name}"',
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    }
    media_type = mimetypes.guess_type(target.name)[0] if inline else "application/octet-stream"
    return FileResponse(target, media_type=media_type, headers=headers)

app.include_router(tags.router)
app.include_router(sprints.router)
app.include_router(tasks.router)
app.include_router(notes.router)
app.include_router(templates.router)
app.include_router(kb.router)
app.include_router(time.router)
app.include_router(activity.router)
app.include_router(recurring.router)
app.include_router(inbox.router)
app.include_router(attachments.router)
app.include_router(stats.router)
app.include_router(profile.router)
app.include_router(plans.router)


@app.exception_handler(IntegrityError)
def _integrity_error(request: Request, exc: IntegrityError) -> JSONResponse:
    """
    A DB constraint rejected the write (CHECK, UNIQUE, FK). That's bad input,
    not a server fault — answer 400 rather than leaking a 500 + stack trace.
    """
    logger.warning("Integrity error on %s %s: %s", request.method, request.url.path, exc.orig)
    return JSONResponse(status_code=400, content={"detail": "Request violates a data constraint."})


@app.exception_handler(DataError)
def _data_error(request: Request, exc: DataError) -> JSONResponse:
    """Value the database can't represent (out-of-range number, bad encoding)."""
    logger.warning("Data error on %s %s: %s", request.method, request.url.path, exc.orig)
    return JSONResponse(status_code=400, content={"detail": "Request contains a value the database rejected."})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
