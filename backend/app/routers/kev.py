from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import KEVEntry
from app.schemas import KEVOut

router = APIRouter(prefix="/api/kev", tags=["kev"])


@router.get("", response_model=List[KEVOut])
def list_kev(
    db: Session = Depends(get_db),
    limit: int = Query(50, le=500),
    ransomware_only: bool = False,
    search: Optional[str] = None,
):
    q = db.query(KEVEntry)
    if ransomware_only:
        q = q.filter(KEVEntry.known_ransomware_use == "Known")
    if search:
        like = f"%{search}%"
        q = q.filter((KEVEntry.cve_id.ilike(like)) | (KEVEntry.vendor_project.ilike(like)) | (KEVEntry.product.ilike(like)))
    return q.order_by(KEVEntry.date_added.desc().nullslast()).limit(limit).all()
