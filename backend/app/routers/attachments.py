import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.config import settings
from app.database import get_db
from app.models import Attachment
from app.schemas import AttachmentRead, AttachmentSource

router = APIRouter(prefix="/api/attachments", tags=["attachments"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


@router.get("", response_model=list[AttachmentRead])
def list_attachments(
    task_id: int | None = None,
    note_id: int | None = None,
    kb_article_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Attachment)
    if task_id is not None:
        stmt = stmt.where(Attachment.task_id == task_id)
    if note_id is not None:
        stmt = stmt.where(Attachment.note_id == note_id)
    if kb_article_id is not None:
        stmt = stmt.where(Attachment.kb_article_id == kb_article_id)
    return db.execute(stmt.order_by(Attachment.created_at.desc())).scalars().all()


@router.post("", response_model=AttachmentRead, status_code=201)
async def upload_attachment(
    file: UploadFile = File(...),
    task_id: int | None = Form(None),
    note_id: int | None = Form(None),
    kb_article_id: int | None = Form(None),
    source: AttachmentSource = Form("upload"),
    db: Session = Depends(get_db),
):
    parents = [p for p in (task_id, note_id, kb_article_id) if p is not None]
    if len(parents) != 1:
        raise HTTPException(400, "Exactly one of task_id, note_id, kb_article_id is required")

    original_name = file.filename or "upload.bin"
    if not original_name.strip():
        raise HTTPException(400, "A filename is required")

    # The stored name is generated server-side, so the client's filename never
    # reaches the filesystem — only a sanitised extension is carried over.
    ext = Path(original_name).suffix.lower()
    if not re.fullmatch(r"\.[A-Za-z0-9]{1,12}", ext or ""):
        ext = ""
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = settings.attachments_path / stored_name

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File exceeds the {MAX_UPLOAD_BYTES // 1_048_576} MB limit")
    dest.write_bytes(contents)

    attachment = Attachment(
        task_id=task_id,
        note_id=note_id,
        kb_article_id=kb_article_id,
        file_name=original_name,
        file_path=stored_name,
        file_type=file.content_type,
        file_size_bytes=len(contents),
        source=source,
    )
    db.add(attachment)
    db.flush()

    entity_type = "task" if task_id else "note" if note_id else "kb"
    entity_id = task_id or note_id or kb_article_id
    log_activity(db, "attachment", attachment.id, "created", {"file_name": original_name, "parent": entity_type, "parent_id": entity_id})

    db.commit()
    db.refresh(attachment)
    return attachment


@router.delete("/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(404, "Attachment not found")
    # Defensive: only ever unlink inside the attachments directory, even if the
    # stored path were somehow tampered with.
    root = settings.attachments_path.resolve()
    file_path = (root / attachment.file_path).resolve()
    if file_path.is_relative_to(root) and file_path.is_file():
        file_path.unlink()
    db.delete(attachment)
    db.commit()
