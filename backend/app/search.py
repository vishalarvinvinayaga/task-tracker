from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import KbArticle, Note
from app.schemas import KbSearchResult, NoteSearchResult


def search_notes(db: Session, query: str, limit: int = 20) -> list[NoteSearchResult]:
    tsquery = func.plainto_tsquery("english", query)
    rank = func.ts_rank(Note.search_vector, tsquery).label("rank")
    snippet = func.ts_headline(
        "english",
        func.coalesce(Note.content_md, ""),
        tsquery,
        "MaxWords=30, MinWords=15, ShortWord=3, HighlightAll=false",
    ).label("snippet")

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
    snippet = func.ts_headline(
        "english",
        func.coalesce(KbArticle.content_md, ""),
        tsquery,
        "MaxWords=30, MinWords=15, ShortWord=3, HighlightAll=false",
    ).label("snippet")

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
