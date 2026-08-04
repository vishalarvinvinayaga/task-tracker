from typing import Any

from sqlalchemy.orm import Session

from app.models import ActivityLog


def log_activity(
    db: Session,
    entity_type: str,
    entity_id: int,
    action: str,
    detail: dict[str, Any] | None = None,
) -> ActivityLog:
    entry = ActivityLog(entity_type=entity_type, entity_id=entity_id, action=action, detail_json=detail)
    db.add(entry)
    db.flush()
    return entry
