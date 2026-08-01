"""Aggregation endpoints powering the dashboard's charts.

Grouping/bucketing is done in Python rather than with DB-specific date
functions (SQLite and Postgres disagree on date truncation syntax), which
keeps this code portable across both backends and easy to unit test.
"""
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import NewsItem, CVEEntry, KEVEntry, RansomwareVictim

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _daily_buckets(dates, days):
    """Returns an ordered list of {date: 'YYYY-MM-DD', count: n} covering the last `days` days."""
    counts = Counter(d.date().isoformat() for d in dates if d is not None)
    today = datetime.now(timezone.utc).date()
    out = []
    for i in range(days - 1, -1, -1):
        day = (today - timedelta(days=i)).isoformat()
        out.append({"date": day, "count": counts.get(day, 0)})
    return out


@router.get("/news-volume")
def news_volume(db: Session = Depends(get_db), days: int = Query(30, le=180)):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.query(NewsItem.published_at).filter(NewsItem.published_at >= cutoff).all()
    return _daily_buckets([r[0] for r in rows], days)


@router.get("/severity-distribution")
def severity_distribution(db: Session = Depends(get_db)):
    rows = db.query(CVEEntry.severity).all()
    counts = Counter((r[0] or "UNKNOWN").upper() for r in rows)
    order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
    return [{"severity": s, "count": counts.get(s, 0)} for s in order if counts.get(s, 0) or s != "UNKNOWN"]


@router.get("/top-ransomware-groups")
def top_ransomware_groups(db: Session = Depends(get_db), limit: int = 10, days: int = 90):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.query(RansomwareVictim.group_name).filter(
        (RansomwareVictim.published_at >= cutoff) | (RansomwareVictim.published_at.is_(None))
    ).all()
    counts = Counter(r[0] for r in rows if r[0])
    return [{"group_name": g, "count": c} for g, c in counts.most_common(limit)]


@router.get("/top-sectors")
def top_sectors(db: Session = Depends(get_db), limit: int = 10, days: int = 90):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.query(RansomwareVictim.sector).filter(
        (RansomwareVictim.published_at >= cutoff) | (RansomwareVictim.published_at.is_(None))
    ).all()
    counts = Counter(r[0] for r in rows if r[0])
    return [{"sector": s, "count": c} for s, c in counts.most_common(limit)]


@router.get("/kev-timeline")
def kev_timeline(db: Session = Depends(get_db), days: int = 90):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.query(KEVEntry.date_added).filter(KEVEntry.date_added >= cutoff).all()
    return _daily_buckets([r[0] for r in rows], days)
