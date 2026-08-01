from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import NewsItem, Advisory, CVEEntry, KEVEntry, RansomwareVictim, IngestLog
from app.schemas import StatsOut

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    last_ingest = db.query(func.max(IngestLog.ran_at)).scalar()
    return StatsOut(
        total_news=db.query(NewsItem).count(),
        total_advisories=db.query(Advisory).count(),
        total_cves=db.query(CVEEntry).count(),
        total_kev=db.query(KEVEntry).count(),
        total_ransomware=db.query(RansomwareVictim).count(),
        news_last_7_days=db.query(NewsItem).filter(NewsItem.published_at >= week_ago).count(),
        ransomware_last_7_days=db.query(RansomwareVictim).filter(RansomwareVictim.published_at >= week_ago).count(),
        kev_ransomware_flagged=db.query(KEVEntry).filter(KEVEntry.known_ransomware_use == "Known").count(),
        last_ingest_at=last_ingest,
    )
