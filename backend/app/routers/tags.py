from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.models import KbTag, NoteTag, Tag, TaskTag
from app.schemas import TagCreate, TagRead, TagUpdate, TagWithUsage

router = APIRouter(prefix="/api/tags", tags=["tags"])


def _usage_counts(db: Session, tag_id: int) -> tuple[int, int, int]:
    task_n = db.execute(select(func.count()).select_from(TaskTag).where(TaskTag.tag_id == tag_id)).scalar_one()
    note_n = db.execute(select(func.count()).select_from(NoteTag).where(NoteTag.tag_id == tag_id)).scalar_one()
    kb_n = db.execute(select(func.count()).select_from(KbTag).where(KbTag.tag_id == tag_id)).scalar_one()
    return task_n, note_n, kb_n


@router.get("", response_model=list[TagWithUsage])
def list_tags(db: Session = Depends(get_db)):
    """Tags with usage counts, so the UI can warn before a destructive delete."""
    tags = db.execute(select(Tag).order_by(Tag.name)).scalars().all()
    out = []
    for tag in tags:
        task_n, note_n, kb_n = _usage_counts(db, tag.id)
        out.append(
            TagWithUsage(
                **TagRead.model_validate(tag).model_dump(),
                task_count=task_n,
                note_count=note_n,
                kb_count=kb_n,
            )
        )
    return out


@router.post("", response_model=TagRead, status_code=201)
def create_tag(payload: TagCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(422, "Tag name cannot be empty")
    # Case-insensitive: "Aimee" and "aimee" would be indistinguishable as chips.
    if db.execute(select(Tag).where(func.lower(Tag.name) == name.lower())).scalar_one_or_none():
        raise HTTPException(409, f"A tag named '{name}' already exists")

    tag = Tag(name=name, color=payload.color)
    db.add(tag)
    db.flush()
    log_activity(db, "tag", tag.id, "created", {"name": tag.name})
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagRead)
def update_tag(tag_id: int, payload: TagUpdate, db: Session = Depends(get_db)):
    """Rename or recolour. Existing associations follow the tag automatically."""
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(422, "Tag name cannot be empty")
        clash = db.execute(
            select(Tag).where(func.lower(Tag.name) == name.lower(), Tag.id != tag_id)
        ).scalar_one_or_none()
        if clash:
            raise HTTPException(409, f"A tag named '{name}' already exists")
        data["name"] = name

    for key, value in data.items():
        setattr(tag, key, value)
    db.flush()
    log_activity(db, "tag", tag.id, "updated", data)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    """
    Removes the tag and its associations everywhere (join rows cascade).
    Tagged tasks/notes/articles themselves are untouched.
    """
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag not found")
    log_activity(db, "tag", tag.id, "deleted", {"name": tag.name})
    db.delete(tag)
    db.commit()
