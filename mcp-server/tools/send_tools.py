import shutil
import uuid
from pathlib import Path

from app.activity import log_activity
from app.config import settings
from app.models import Attachment, Note, Task
from app_instance import mcp
from tools._common import jsonable, note_dict, session


@mcp.tool()
def send_to_task(task_id: int, content_md: str, title: str | None = None, attachment_paths: list[str] | None = None) -> dict:
    """Push content from Claude Code into a task as a note — the primary way to send code
    analysis, architecture reviews, or bug investigation results into the planner.
    attachment_paths are absolute local file paths to copy in as attachments."""
    with session() as db:
        task = db.get(Task, task_id)
        if not task:
            return {"error": f"Task {task_id} not found"}

        note = Note(
            task_id=task_id,
            title=title or f"Claude Code output — {content_md.splitlines()[0][:60] if content_md else 'untitled'}",
            content_md=content_md,
            note_type="general",
            source="claude_code",
        )
        db.add(note)
        db.flush()
        log_activity(db, "note", note.id, "created", {"title": note.title, "task_id": task_id, "source": "claude_code"})

        created_attachments = []
        for path_str in attachment_paths or []:
            src = Path(path_str)
            if not src.is_file():
                continue
            stored_name = f"{uuid.uuid4().hex}{src.suffix}"
            dest = settings.attachments_path / stored_name
            shutil.copyfile(src, dest)
            attachment = Attachment(
                note_id=note.id,
                file_name=src.name,
                file_path=stored_name,
                file_size_bytes=dest.stat().st_size,
                source="claude_code",
            )
            db.add(attachment)
            db.flush()
            log_activity(db, "attachment", attachment.id, "created", {"file_name": src.name, "parent": "note", "parent_id": note.id})
            created_attachments.append({"id": attachment.id, "file_name": attachment.file_name})

        return jsonable({"note": note_dict(note), "attachments": created_attachments})
