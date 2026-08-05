import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.models import RecurringTask, Sprint, Tag, Task
from app.schemas import RecurringTaskCreate, RecurringTaskRead, RecurringTaskUpdate
from app.tag_utils import resolve_tags

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


@router.get("", response_model=list[RecurringTaskRead])
def list_recurring(db: Session = Depends(get_db)):
    return db.execute(select(RecurringTask).order_by(RecurringTask.title)).scalars().all()


@router.post("", response_model=RecurringTaskRead, status_code=201)
def create_recurring(payload: RecurringTaskCreate, db: Session = Depends(get_db)):
    entry = RecurringTask(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/{recurring_id}", response_model=RecurringTaskRead)
def update_recurring(recurring_id: int, payload: RecurringTaskUpdate, db: Session = Depends(get_db)):
    entry = db.get(RecurringTask, recurring_id)
    if not entry:
        raise HTTPException(404, "Recurring task not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{recurring_id}", status_code=204)
def delete_recurring(recurring_id: int, db: Session = Depends(get_db)):
    entry = db.get(RecurringTask, recurring_id)
    if not entry:
        raise HTTPException(404, "Recurring task not found")
    db.delete(entry)
    db.commit()


def _is_due(entry: RecurringTask, now: dt.datetime) -> bool:
    if entry.last_created_at and entry.last_created_at.date() == now.date():
        return False
    if entry.frequency == "daily":
        return True
    if entry.frequency == "weekly":
        sunday_zero_weekday = (now.weekday() + 1) % 7
        return entry.day_of_week is None or entry.day_of_week == sunday_zero_weekday
    if entry.frequency == "monthly":
        return entry.day_of_month is None or entry.day_of_month == now.day
    return False


def run_recurring_generation(db: Session) -> list[Task]:
    """Create tasks for any active recurring_tasks that are due. Called on app startup and via manual trigger."""
    now = dt.datetime.now()
    active_sprint = db.execute(select(Sprint).where(Sprint.status == "active", Sprint.container_type == "sprint")).scalar_one_or_none()
    if not active_sprint:
        return []

    created: list[Task] = []
    entries = db.execute(select(RecurringTask).where(RecurringTask.active.is_(True))).scalars().all()
    for entry in entries:
        if not _is_due(entry, now):
            continue
        task = Task(
            sprint_id=active_sprint.id,
            title=entry.title,
            description_md=entry.description_md,
        )
        if entry.tag_names:
            names = [n.strip() for n in entry.tag_names.split(",") if n.strip()]
            existing = {t.name: t for t in db.execute(select(Tag).where(Tag.name.in_(names))).scalars().all()}
            tags = []
            for name in names:
                tag = existing.get(name)
                if not tag:
                    tag = Tag(name=name)
                    db.add(tag)
                    db.flush()
                tags.append(tag)
            task.tags = tags
        db.add(task)
        db.flush()
        log_activity(db, "task", task.id, "created", {"title": task.title, "source": "recurring", "recurring_id": entry.id})
        entry.last_created_at = now
        created.append(task)

    if created:
        db.commit()
    return created


@router.post("/run", response_model=list[RecurringTaskRead])
def run_now(db: Session = Depends(get_db)):
    run_recurring_generation(db)
    return db.execute(select(RecurringTask).order_by(RecurringTask.title)).scalars().all()
