from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Advisory
from app.schemas import AdvisoryOut

router = APIRouter(prefix="/api/advisories", tags=["advisories"])


@router.get("", response_model=List[AdvisoryOut])
def list_advisories(
    db: Session = Depends(get_db),
    limit: int = Query(50, le=500),
    search: Optional[str] = None,
):
    q = db.query(Advisory)
    if search:
        q = q.filter(Advisory.title.ilike(f"%{search}%"))
    return q.order_by(Advisory.published_at.desc().nullslast()).limit(limit).all()
