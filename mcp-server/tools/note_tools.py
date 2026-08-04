from sqlalchemy import select

from app.activity import log_activity
from app.models import KbArticle, Note, NoteLink, Tag
from app.search import search_notes as search_notes_query
from app_instance import mcp
from tools._common import jsonable, kb_dict, note_dict, session


def _resolve_tags(db, names: list[str] | None) -> list[Tag]:
    if not names:
        return []
    existing = {t.name: t for t in db.execute(select(Tag).where(Tag.name.in_(names))).scalars().all()}
    tags = []
    for name in names:
        tag = existing.get(name)
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        tags.append(tag)
    return tags


@mcp.tool()
def create_note(
    title: str,
    content_md: str,
    task_id: int | None = None,
    note_type: str = "general",
    attendees: str | None = None,
    tags: list[str] | None = None,
    caller: str = "claude_desktop",
) -> dict:
    """Create a note, optionally linked to a task. note_type: general|meeting|standup|retro.
    caller should be 'claude_desktop' or 'claude_code' depending on where this is called from."""
    with session() as db:
        source = caller if caller in ("claude_desktop", "claude_code") else "claude_desktop"
        note = Note(title=title, content_md=content_md, task_id=task_id, note_type=note_type, attendees=attendees, source=source)
        note.tags = _resolve_tags(db, tags)
        db.add(note)
        db.flush()
        log_activity(db, "note", note.id, "created", {"title": note.title, "source": source})
        return note_dict(note)


@mcp.tool()
def search_notes(query: str, limit: int = 10) -> list[dict]:
    """Full-text search notes by title and content. Returns matches with snippets."""
    with session() as db:
        results = search_notes_query(db, query, limit)
        return jsonable([r.model_dump() for r in results])


@mcp.tool()
def link_notes(from_note_id: int, to_note_id: int, link_type: str = "reference") -> dict:
    """Create a directed link between two notes. link_type: reference|related|followup."""
    with session() as db:
        if not db.get(Note, from_note_id) or not db.get(Note, to_note_id):
            return {"error": "One or both notes not found"}
        existing = db.execute(
            select(NoteLink).where(NoteLink.from_note_id == from_note_id, NoteLink.to_note_id == to_note_id)
        ).scalar_one_or_none()
        if existing:
            return {"error": "Link already exists"}
        link = NoteLink(from_note_id=from_note_id, to_note_id=to_note_id, link_type=link_type)
        db.add(link)
        db.flush()
        log_activity(db, "note", from_note_id, "linked", {"to_note_id": to_note_id, "link_type": link_type})
        return jsonable({"id": link.id, "from_note_id": from_note_id, "to_note_id": to_note_id, "link_type": link_type})


@mcp.tool()
def promote_note_to_kb(note_id: int, category: str | None = None) -> dict:
    """Promote a note into a knowledge base article, copying its content."""
    with session() as db:
        note = db.get(Note, note_id)
        if not note:
            return {"error": f"Note {note_id} not found"}
        article = KbArticle(title=note.title, content_md=note.content_md, category=category, source_note_id=note.id)
        article.tags = list(note.tags)
        db.add(article)
        db.flush()
        log_activity(db, "kb", article.id, "created", {"source_note_id": note.id, "promoted": True})
        return kb_dict(article)
