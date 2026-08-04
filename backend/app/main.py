from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import SessionLocal
from app.routers import activity, attachments, inbox, kb, notes, profile, recurring, sprints, stats, tags, tasks, templates, time
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

app.mount("/attachments", StaticFiles(directory=str(settings.attachments_path)), name="attachments")

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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
