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
    search: Optional[str] = None,
):
    q = db.query(RansomwareVictim)
    if group:
        q = q.filter(RansomwareVictim.group_name == group)
    if country:
        q = q.filter(RansomwareVictim.country == country.upper())
    if search:
        like = f"%{search}%"
        q = q.filter(
            (RansomwareVictim.victim_name.ilike(like))
            | (RansomwareVictim.group_name.ilike(like))
            | (RansomwareVictim.sector.ilike(like))
        )
    return q.order_by(RansomwareVictim.published_at.desc().nullslast()).limit(limit).all()


@router.get("/count")
def count_ransomware(
    db: Session = Depends(get_db),
    group: Optional[str] = None,
    country: Optional[str] = None,
    search: Optional[str] = None,
):
    """Total matching rows, ignoring `limit` - lets the frontend show an
    honest "X of Y" even when Y is in the thousands and nowhere near fully
    loaded into the browser.
    """
    q = db.query(RansomwareVictim)
    if group:
        q = q.filter(RansomwareVictim.group_name == group)
    if country:
        q = q.filter(RansomwareVictim.country == country.upper())
    if search:
        like = f"%{search}%"
        q = q.filter(
            (RansomwareVictim.victim_name.ilike(like))
            | (RansomwareVictim.group_name.ilike(like))
            | (RansomwareVictim.sector.ilike(like))
        )
    return {"total": q.count()}
