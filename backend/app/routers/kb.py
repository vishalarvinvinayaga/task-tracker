from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import distinct, select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.models import KbArticle, Tag
from app.schemas import KbArticleCreate, KbArticleRead, KbArticleUpdate, KbSearchResult
from app.search import search_kb
from app.tag_utils import resolve_tags

router = APIRouter(prefix="/api/kb", tags=["kb"])


@router.get("", response_model=list[KbArticleRead])
def list_articles(category: str | None = None, tag_id: int | None = None, db: Session = Depends(get_db)):
    stmt = select(KbArticle)
    if category is not None:
        stmt = stmt.where(KbArticle.category == category)
    if tag_id is not None:
        stmt = stmt.join(KbArticle.tags).where(Tag.id == tag_id)
    stmt = stmt.order_by(KbArticle.category, KbArticle.title)
    return db.execute(stmt).scalars().unique().all()


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    rows = db.execute(select(distinct(KbArticle.category)).where(KbArticle.category.is_not(None))).scalars().all()
    return sorted(rows)


@router.get("/search", response_model=list[KbSearchResult])
def search(q: str = Query(..., min_length=1), limit: int = 20, db: Session = Depends(get_db)):
    return search_kb(db, q, limit)


@router.get("/{article_id}", response_model=KbArticleRead)
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.get(KbArticle, article_id)
    if not article:
        raise HTTPException(404, "Article not found")
    return article


@router.post("", response_model=KbArticleRead, status_code=201)
def create_article(payload: KbArticleCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"tag_ids"})
    article = KbArticle(**data)
    article.tags = resolve_tags(db, payload.tag_ids)
    db.add(article)
    db.flush()
    log_activity(db, "kb", article.id, "created", {"title": article.title})
    db.commit()
    db.refresh(article)
    return article


@router.put("/{article_id}", response_model=KbArticleRead)
def update_article(article_id: int, payload: KbArticleUpdate, db: Session = Depends(get_db)):
    article = db.get(KbArticle, article_id)
    if not article:
        raise HTTPException(404, "Article not found")

    data = payload.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for key, value in data.items():
        setattr(article, key, value)
    if payload.tag_ids is not None:
        article.tags = resolve_tags(db, payload.tag_ids)

    db.flush()
    log_activity(db, "kb", article.id, "updated", data)
    db.commit()
    db.refresh(article)
    return article


@router.delete("/{article_id}", status_code=204)
def delete_article(article_id: int, db: Session = Depends(get_db)):
    article = db.get(KbArticle, article_id)
    if not article:
        raise HTTPException(404, "Article not found")
    db.delete(article)
    db.commit()
