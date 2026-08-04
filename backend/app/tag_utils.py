from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Tag


def resolve_tags(db: Session, tag_ids: list[int]) -> list[Tag]:
    if not tag_ids:
        return []
    return list(db.execute(select(Tag).where(Tag.id.in_(tag_ids))).scalars().all())
