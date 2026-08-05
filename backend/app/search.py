from sqlalchemy import func, literal, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.models import KbArticle, Note
from app.schemas import KbSearchResult, NoteSearchResult

# ts_headline returns the *source text* verbatim with <b>…</b> wrapped around
# matches. The UI renders that with dangerouslySetInnerHTML to keep the
# highlight, so any HTML living in a note/article body would execute — stored
# XSS. Escape the text before it reaches ts_headline; the only markup left in
# the result is then the highlight ts_headline adds itself.
_HEADLINE_OPTS = "MaxWords=30, MinWords=15, ShortWord=3, HighlightAll=false"


def _escape_html(column: ColumnElement) -> ColumnElement:
    """&, <, > → entities. Ampersand first, or the entities get double-escaped."""
    escaped = func.replace(func.coalesce(column, ""), literal("&"), literal("&amp;"))
    escaped = func.replace(escaped, literal("<"), literal("&lt;"))
    escaped = func.replace(escaped, literal(">"), literal("&gt;"))
    return escaped


def search_notes(db: Session, query: str, limit: int = 20) -> list[NoteSearchResult]:
    tsquery = func.plainto_tsquery("english", query)
    rank = func.ts_rank(Note.search_vector, tsquery).label("rank")
    snippet = func.ts_headline("english", _escape_html(Note.content_md), tsquery, _HEADLINE_OPTS).label("snippet")

    stmt = (
        select(Note.id, Note.title, snippet, Note.note_type, Note.created_at, rank)
        .where(Note.search_vector.op("@@")(tsquery))
        .order_by(rank.desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    return [
        NoteSearchResult(id=r.id, title=r.title, snippet=r.snippet or "", note_type=r.note_type, created_at=r.created_at)
        for r in rows
    ]


def search_kb(db: Session, query: str, limit: int = 20) -> list[KbSearchResult]:
    tsquery = func.plainto_tsquery("english", query)
    rank = func.ts_rank(KbArticle.search_vector, tsquery).label("rank")
    snippet = func.ts_headline("english", _escape_html(KbArticle.content_md), tsquery, _HEADLINE_OPTS).label("snippet")

    stmt = (
        select(KbArticle.id, KbArticle.title, snippet, KbArticle.category, KbArticle.created_at, rank)
        .where(KbArticle.search_vector.op("@@")(tsquery))
        .order_by(rank.desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    return [
        KbSearchResult(id=r.id, title=r.title, snippet=r.snippet or "", category=r.category, created_at=r.created_at)
        for r in rows
    ]
