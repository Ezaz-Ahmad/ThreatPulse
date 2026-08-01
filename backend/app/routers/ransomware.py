from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import RansomwareVictim
from app.schemas import RansomwareOut

router = APIRouter(prefix="/api/ransomware", tags=["ransomware"])


@router.get("", response_model=List[RansomwareOut])
def list_ransomware(
    db: Session = Depends(get_db),
    limit: int = Query(50, le=500),
    group: Optional[str] = None,
    country: Optional[str] = None,
):
    q = db.query(RansomwareVictim)
    if group:
        q = q.filter(RansomwareVictim.group_name == group)
    if country:
        q = q.filter(RansomwareVictim.country == country.upper())
    return q.order_by(RansomwareVictim.published_at.desc().nullslast()).limit(limit).all()
