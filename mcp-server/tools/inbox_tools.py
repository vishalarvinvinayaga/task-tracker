import datetime as dt

from sqlalchemy import select

from app.activity import log_activity
from app.models import InboxItem, KbArticle, Note, Sprint, Task
from app_instance import mcp
from tools._common import jsonable, session


@mcp.tool()
def quick_capture(content: str) -> dict:
    """Capture a piece of text into the inbox for later triage."""
    with session() as db:
        item = InboxItem(content=content)
        db.add(item)
        db.flush()
        log_activity(db, "inbox", item.id, "created", {"content": content[:100]})
        return jsonable({"id": item.id, "content": item.content, "created_at": item.created_at})


@mcp.tool()
def list_inbox(include_resolved: bool = False) -> list[dict]:
    """List inbox items, oldest first. By default only unresolved items are returned."""
    with session() as db:
        stmt = select(InboxItem)
        if not include_resolved:
            stmt = stmt.where(InboxItem.resolved_to.is_(None))
        items = db.execute(stmt.order_by(InboxItem.created_at)).scalars().all()
        return jsonable([
            {"id": i.id, "content": i.content, "resolved_to": i.resolved_to, "created_at": i.created_at} for i in items
        ])


@mcp.tool()
def resolve_inbox_item(inbox_id: int, resolve_to: str, title: str | None = None, content_md: str | None = None) -> dict:
    """Resolve an inbox item. resolve_to: task|note|kb|dismissed. For task/note/kb, creates
    the corresponding entity (title/content_md optional overrides; defaults to the inbox text)."""
    with session() as db:
        item = db.get(InboxItem, inbox_id)
        if not item:
            return {"error": f"Inbox item {inbox_id} not found"}
        if item.resolved_to:
            return {"error": "Already resolved"}

        resolved_id = None
        if resolve_to == "task":
            sprint = db.execute(select(Sprint).where(Sprint.status == "active", Sprint.container_type == "sprint")).scalar_one_or_none()
            if not sprint:
                return {"error": "No active sprint to add the task to"}
            task = Task(sprint_id=sprint.id, title=title or item.content)
            db.add(task)
            db.flush()
            log_activity(db, "task", task.id, "created", {"title": task.title, "source": "inbox"})
            resolved_id = task.id
        elif resolve_to == "note":
            note = Note(title=title or item.content[:80], content_md=content_md or item.content)
            db.add(note)
            db.flush()
            log_activity(db, "note", note.id, "created", {"title": note.title, "source": "inbox"})
            resolved_id = note.id
        elif resolve_to == "kb":
            article = KbArticle(title=title or item.content[:80], content_md=content_md or item.content)
            db.add(article)
            db.flush()
            log_activity(db, "kb", article.id, "created", {"title": article.title, "source": "inbox"})
            resolved_id = article.id
        elif resolve_to != "dismissed":
            return {"error": "resolve_to must be one of task|note|kb|dismissed"}

        item.resolved_to = resolve_to
        item.resolved_id = resolved_id
        item.resolved_at = dt.datetime.now()
        db.flush()
        log_activity(db, "inbox", item.id, "resolved", {"resolve_to": resolve_to, "resolved_id": resolved_id})
        return jsonable({"id": item.id, "resolved_to": resolve_to, "resolved_id": resolved_id})
