from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ActivityLog
from app.schemas import ActivityLogRead

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("", response_model=list[ActivityLogRead])
def list_activity(
    entity_type: str | None = None,
    entity_id: int | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    stmt = select(ActivityLog)
    if entity_type is not None:
        stmt = stmt.where(ActivityLog.entity_type == entity_type)
    if entity_id is not None:
        stmt = stmt.where(ActivityLog.entity_id == entity_id)
    stmt = stmt.order_by(ActivityLog.created_at.desc()).limit(limit)
    return db.execute(stmt).scalars().all()
