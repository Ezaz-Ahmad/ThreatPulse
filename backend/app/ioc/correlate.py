"""Correlate an indicator against ThreatPulse's own ingested intelligence.

This is what the "ThreatPulse database" source in the lookup report refers
to: has this IP/domain/hash/URL already shown up in the news articles,
CISA advisories, or ransomware victim postings ThreatPulse has ingested?
That's cheap (it's just a substring search over data already in the local
DB) and it's often the most relevant hit, since it means the indicator is
tied to *named, dated* reporting rather than an anonymous reputation score.
"""
from sqlalchemy.orm import Session

from app.models import NewsItem, Advisory, RansomwareVictim

_MAX_MATCHES_PER_SOURCE = 5


def correlate(db: Session, indicator: str) -> dict:
    like = f"%{indicator}%"

    news_matches = (
        db.query(NewsItem)
        .filter((NewsItem.title.ilike(like)) | (NewsItem.summary.ilike(like)))
        .order_by(NewsItem.published_at.desc().nullslast())
        .limit(_MAX_MATCHES_PER_SOURCE)
        .all()
    )
    advisory_matches = (
        db.query(Advisory)
        .filter(Advisory.title.ilike(like))
        .order_by(Advisory.published_at.desc().nullslast())
        .limit(_MAX_MATCHES_PER_SOURCE)
        .all()
    )
    ransomware_matches = (
        db.query(RansomwareVictim)
        .filter(RansomwareVictim.victim_name.ilike(like))
        .order_by(RansomwareVictim.published_at.desc().nullslast())
        .limit(_MAX_MATCHES_PER_SOURCE)
        .all()
    )

    mentions = [
        {"type": "news", "title": n.title, "link": n.link, "published_at": n.published_at}
        for n in news_matches
    ] + [
        {"type": "advisory", "title": a.title, "link": a.link, "published_at": a.published_at}
        for a in advisory_matches
    ] + [
        {
            "type": "ransomware",
            "title": f"{r.group_name} — {r.victim_name}",
            "link": r.link,
            "published_at": r.published_at,
            "group_name": r.group_name,
        }
        for r in ransomware_matches
    ]

    # Surfaced separately (not just buried in `mentions`) so the recommendation
    # rule engine can key group-specific guidance - e.g. an indicator tied to
    # a LockBit posting should suggest checking for VSS deletion and backup
    # tampering, which is meaningless for an indicator with no ransomware tie.
    ransomware_groups = sorted({r.group_name for r in ransomware_matches if r.group_name})

    return {
        "status": "success" if mentions else "no_match",
        "mention_count": len(mentions),
        "mentions": mentions,
        "ransomware_groups": ransomware_groups,
    }
