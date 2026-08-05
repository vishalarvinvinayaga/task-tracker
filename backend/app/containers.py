"""
Shared rules for task containers (sprints and lists).

The central guarantee: there is *always* somewhere to put a task. Callers that
don't name a container get one resolved for them, and the protected Backlog is
the guaranteed fallback — so capturing a task never requires setting up a
sprint first.
"""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Sprint

BACKLOG_NAME = "Backlog"


def get_backlog(db: Session) -> Sprint | None:
    return db.execute(select(Sprint).where(Sprint.is_protected.is_(True))).scalars().first()


def ensure_backlog(db: Session) -> Sprint:
    """Fetch the protected Backlog, creating it if this database predates it."""
    backlog = get_backlog(db)
    if backlog:
        return backlog

    backlog = Sprint(
        name=BACKLOG_NAME,
        container_type="list",
        status="active",
        default_view="list",
        is_protected=True,
    )
    db.add(backlog)
    db.flush()
    return backlog


def resolve_default_container_id(db: Session) -> int:
    """
    Where a task goes when the caller didn't say.

    Preference order: the active sprint (you're mid-cycle, that's the intent),
    then the Backlog. Never raises — that was the old failure mode.
    """
    active = db.execute(
        select(Sprint).where(Sprint.status == "active", Sprint.container_type == "sprint")
    ).scalar_one_or_none()
    if active:
        return active.id
    return ensure_backlog(db).id


def require_sprint(container: Sprint) -> None:
    """Guard for ceremony that only makes sense on a time-boxed sprint."""
    if container.container_type != "sprint":
        raise HTTPException(
            400,
            f"'{container.name}' is a list, not a sprint. "
            "Closing, carry-over and retros apply to sprints only.",
        )
