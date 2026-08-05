import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.models import InboxItem, KbArticle, Note, Sprint, Task
from app.schemas import InboxItemCreate, InboxItemRead, InboxResolveRequest

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


@router.get("", response_model=list[InboxItemRead])
def list_inbox(include_resolved: bool = False, db: Session = Depends(get_db)):
    stmt = select(InboxItem)
    if not include_resolved:
        stmt = stmt.where(InboxItem.resolved_to.is_(None))
    stmt = stmt.order_by(InboxItem.created_at)
    return db.execute(stmt).scalars().all()


@router.post("", response_model=InboxItemRead, status_code=201)
def quick_capture(payload: InboxItemCreate, db: Session = Depends(get_db)):
    item = InboxItem(content=payload.content)
    db.add(item)
    db.flush()
    log_activity(db, "inbox", item.id, "created", {"content": payload.content[:100]})
    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/resolve", response_model=InboxItemRead)
def resolve_item(item_id: int, payload: InboxResolveRequest, db: Session = Depends(get_db)):
    item = db.get(InboxItem, item_id)
    if not item:
        raise HTTPException(404, "Inbox item not found")
    if item.resolved_to:
        raise HTTPException(409, "Already resolved")

    data = payload.target_data or {}
    resolved_id: int | None = None

    if payload.resolve_to == "task":
        sprint = db.execute(select(Sprint).where(Sprint.status == "active", Sprint.container_type == "sprint")).scalar_one_or_none()
        if not sprint:
            raise HTTPException(400, "No active sprint to add the task to")
        task = Task(sprint_id=sprint.id, title=data.get("title", item.content))
        db.add(task)
        db.flush()
        log_activity(db, "task", task.id, "created", {"title": task.title, "source": "inbox"})
        resolved_id = task.id
    elif payload.resolve_to == "note":
        note = Note(title=data.get("title", item.content[:80]), content_md=data.get("content_md", item.content))
        db.add(note)
        db.flush()
        log_activity(db, "note", note.id, "created", {"title": note.title, "source": "inbox"})
        resolved_id = note.id
    elif payload.resolve_to == "kb":
        article = KbArticle(title=data.get("title", item.content[:80]), content_md=data.get("content_md", item.content))
        db.add(article)
        db.flush()
        log_activity(db, "kb", article.id, "created", {"title": article.title, "source": "inbox"})
        resolved_id = article.id

    item.resolved_to = payload.resolve_to
    item.resolved_id = resolved_id
    item.resolved_at = dt.datetime.now()
    db.flush()
    log_activity(db, "inbox", item.id, "resolved", {"resolve_to": payload.resolve_to, "resolved_id": resolved_id})
    db.commit()
    db.refresh(item)
    return item
