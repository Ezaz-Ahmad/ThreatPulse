from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import NewsItem
from app.schemas import NewsItemOut

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("", response_model=List[NewsItemOut])
def list_news(
    db: Session = Depends(get_db),
    limit: int = Query(50, le=500),
    source: Optional[str] = None,
    search: Optional[str] = None,
):
    q = db.query(NewsItem)
    if source:
        q = q.filter(NewsItem.source == source)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(NewsItem.title.ilike(like), NewsItem.summary.ilike(like)))
    return q.order_by(NewsItem.published_at.desc().nullslast()).limit(limit).all()
