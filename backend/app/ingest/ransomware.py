"""Ransomware leak-site tracker ingestion via the public ransomware.live API.

NOTE: ransomware.live's exact JSON field names have changed between API versions
in the past. This parser reads several plausible key names defensively. If your
run logs show 0 new records but the API responds with data, print a sample
record and adjust the key lookups below.
"""
import logging
import requests
from app.models import RansomwareVictim
from app.ingest.utils import parse_any_date, upsert

logger = logging.getLogger(__name__)

RANSOMWARE_LIVE_URL = "https://api.ransomware.live/v2/recentvictims"
HEADERS = {"User-Agent": "threatpulse/1.0 (personal research project)"}


def _first(d: dict, keys, default=None):
    for k in keys:
        if d.get(k):
            return d.get(k)
    return default


def process_records(db, records: list) -> int:
    """Upserts ransomware victim records from an already-parsed list of dicts. Testable offline."""
    new_count = 0
    for r in records:
        group_name = _first(r, ["group_name", "group", "groupname"], "Unknown")
        victim_name = _first(r, ["post_title", "victim", "title", "victimname"])
        if not victim_name:
            continue
        date_raw = _first(r, ["published", "discovered", "attackdate", "date"])
        published_at = parse_any_date(date_raw)
        country = _first(r, ["country"])
        sector = _first(r, ["activity", "sector", "industry"])
        link = _first(r, ["post_url", "url", "link"])

        unique_filter = {
            "group_name": group_name,
            "victim_name": victim_name[:300],
            "published_at": published_at,
        }
        inserted = upsert(
            db,
            RansomwareVictim,
            unique_filter,
            {
                "country": country,
                "sector": sector,
                "link": link,
            },
        )
        if inserted:
            new_count += 1
    return new_count


def fetch_ransomware(db) -> int:
    try:
        resp = requests.get(RANSOMWARE_LIVE_URL, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        records = data if isinstance(data, list) else data.get("data", [])
        count = process_records(db, records)
        db.commit()
        return count
    except Exception as e:
        logger.exception("Error fetching ransomware.live data: %s", e)
        db.rollback()
        return 0
