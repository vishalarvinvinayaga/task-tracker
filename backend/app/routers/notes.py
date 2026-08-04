from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.models import KbArticle, Note, NoteLink, Tag
from app.schemas import (
    KbArticleRead,
    NoteCreate,
    NoteLinkCreate,
    NoteLinkRead,
    NoteRead,
    NoteSearchResult,
    NoteUpdate,
    PromoteNoteRequest,
)
from app.search import search_notes
from app.tag_utils import resolve_tags

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=list[NoteRead])
def list_notes(
    task_id: int | None = None,
    note_type: str | None = None,
    source: str | None = None,
    tag_id: int | None = None,
    standalone_only: bool = False,
    db: Session = Depends(get_db),
):
    stmt = select(Note)
    if task_id is not None:
        stmt = stmt.where(Note.task_id == task_id)
    if standalone_only:
        stmt = stmt.where(Note.task_id.is_(None))
    if note_type is not None:
        stmt = stmt.where(Note.note_type == note_type)
    if source is not None:
        stmt = stmt.where(Note.source == source)
    if tag_id is not None:
        stmt = stmt.join(Note.tags).where(Tag.id == tag_id)
    stmt = stmt.order_by(Note.created_at.desc())
    return db.execute(stmt).scalars().unique().all()


@router.get("/search", response_model=list[NoteSearchResult])
def search(q: str = Query(..., min_length=1), limit: int = 20, db: Session = Depends(get_db)):
    return search_notes(db, q, limit)


@router.get("/{note_id}", response_model=NoteRead)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    return note


@router.post("", response_model=NoteRead, status_code=201)
def create_note(payload: NoteCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"tag_ids"})
    note = Note(**data)
    note.tags = resolve_tags(db, payload.tag_ids)
    db.add(note)
    db.flush()
    log_activity(db, "note", note.id, "created", {"title": note.title, "task_id": note.task_id})
    db.commit()
    db.refresh(note)
    return note


@router.put("/{note_id}", response_model=NoteRead)
def update_note(note_id: int, payload: NoteUpdate, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")

    data = payload.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for key, value in data.items():
        setattr(note, key, value)
    if payload.tag_ids is not None:
        note.tags = resolve_tags(db, payload.tag_ids)

    db.flush()
    log_activity(db, "note", note.id, "updated", data)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    db.delete(note)
    db.commit()


@router.get("/{note_id}/links", response_model=list[NoteLinkRead])
def list_links(note_id: int, db: Session = Depends(get_db)):
    stmt = select(NoteLink).where((NoteLink.from_note_id == note_id) | (NoteLink.to_note_id == note_id))
    return db.execute(stmt).scalars().all()


@router.post("/{note_id}/links", response_model=NoteLinkRead, status_code=201)
def create_link(note_id: int, payload: NoteLinkCreate, db: Session = Depends(get_db)):
    if not db.get(Note, note_id) or not db.get(Note, payload.to_note_id):
        raise HTTPException(404, "Note not found")
    existing = db.execute(
        select(NoteLink).where(NoteLink.from_note_id == note_id, NoteLink.to_note_id == payload.to_note_id)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(409, "Link already exists")
    link = NoteLink(from_note_id=note_id, to_note_id=payload.to_note_id, link_type=payload.link_type)
    db.add(link)
    db.flush()
    log_activity(db, "note", note_id, "linked", {"to_note_id": payload.to_note_id, "link_type": payload.link_type})
    db.commit()
    db.refresh(link)
    return link


@router.delete("/{note_id}/links/{link_id}", status_code=204)
def delete_link(note_id: int, link_id: int, db: Session = Depends(get_db)):
    link = db.get(NoteLink, link_id)
    if not link or (link.from_note_id != note_id and link.to_note_id != note_id):
        raise HTTPException(404, "Link not found")
    db.delete(link)
    db.commit()


@router.post("/{note_id}/promote", response_model=KbArticleRead, status_code=201)
def promote_to_kb(note_id: int, payload: PromoteNoteRequest, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    article = KbArticle(
        title=note.title,
        content_md=note.content_md,
        category=payload.category,
        source_note_id=note.id,
    )
    article.tags = list(note.tags)
    db.add(article)
    db.flush()
    log_activity(db, "kb", article.id, "created", {"source_note_id": note.id, "promoted": True})
    db.commit()
    db.refresh(article)
    return article
