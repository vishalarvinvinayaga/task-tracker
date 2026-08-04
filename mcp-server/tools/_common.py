import datetime as dt
from contextlib import contextmanager
from decimal import Decimal
from typing import Any

from db import SessionLocal


@contextmanager
def session():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def jsonable(value: Any) -> Any:
    """Recursively convert datetimes/Decimals/ORM-ish objects into JSON-safe primitives."""
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {k: jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(v) for v in value]
    return value


def task_dict(task) -> dict:
    return jsonable({
        "id": task.id,
        "sprint_id": task.sprint_id,
        "title": task.title,
        "description_md": task.description_md,
        "status": task.status,
        "priority": task.priority,
        "task_type": task.task_type,
        "ticket_id": task.ticket_id,
        "ticket_url": task.ticket_url,
        "estimated_hours": task.estimated_hours,
        "actual_hours": task.actual_hours,
        "due_date": task.due_date,
        "carried_from_task_id": task.carried_from_task_id,
        "tags": [t.name for t in task.tags],
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    })


def sprint_dict(sprint) -> dict:
    return jsonable({
        "id": sprint.id,
        "name": sprint.name,
        "goals_summary": sprint.goals_summary,
        "start_date": sprint.start_date,
        "end_date": sprint.end_date,
        "status": sprint.status,
    })


def note_dict(note) -> dict:
    return jsonable({
        "id": note.id,
        "task_id": note.task_id,
        "title": note.title,
        "content_md": note.content_md,
        "note_type": note.note_type,
        "attendees": note.attendees,
        "source": note.source,
        "created_at": note.created_at,
    })


def kb_dict(article) -> dict:
    return jsonable({
        "id": article.id,
        "title": article.title,
        "content_md": article.content_md,
        "category": article.category,
        "source_note_id": article.source_note_id,
        "created_at": article.created_at,
    })
