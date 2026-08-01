from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import CVEEntry
from app.schemas import CVEOut

router = APIRouter(prefix="/api/cves", tags=["cves"])


@router.get("", response_model=List[CVEOut])
def list_cves(
    db: Session = Depends(get_db),
    limit: int = Query(50, le=500),
    min_score: Optional[float] = None,
    search: Optional[str] = None,
):
    q = db.query(CVEEntry)
    if min_score is not None:
        q = q.filter(CVEEntry.cvss_score >= min_score)
    if search:
        like = f"%{search}%"
        q = q.filter((CVEEntry.cve_id.ilike(like)) | (CVEEntry.description.ilike(like)))
    return q.order_by(CVEEntry.published_at.desc().nullslast()).limit(limit).all()
