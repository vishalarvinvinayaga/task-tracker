from sqlalchemy import select

from app.activity import log_activity
from app.models import KbArticle, Tag
from app.search import search_kb as search_kb_query
from app_instance import mcp
from tools._common import jsonable, kb_dict, session


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
def add_kb_article(title: str, content_md: str, category: str | None = None, tags: list[str] | None = None) -> dict:
    """Add a knowledge base article."""
    with session() as db:
        article = KbArticle(title=title, content_md=content_md, category=category)
        article.tags = _resolve_tags(db, tags)
        db.add(article)
        db.flush()
        log_activity(db, "kb", article.id, "created", {"title": title})
        return kb_dict(article)


@mcp.tool()
def search_kb(query: str, limit: int = 10) -> list[dict]:
    """Full-text search knowledge base articles by title and content. Returns matches with snippets."""
    with session() as db:
        results = search_kb_query(db, query, limit)
        return jsonable([r.model_dump() for r in results])
