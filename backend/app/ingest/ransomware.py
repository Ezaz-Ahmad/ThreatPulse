"""Ransomware leak-site tracker ingestion via the public ransomware.live API.

NOTE: ransomware.live's exact JSON field names have changed between API versions
in the past. This parser reads several plausible key names defensively. If your
run logs show 0 new records but the API responds with data, print a sample
record and adjust the key lookups below.
"""
import logging
import time
from datetime import date

import requests
from app.models import RansomwareVictim
from app.ingest.utils import parse_any_date, upsert

logger = logging.getLogger(__name__)

RANSOMWARE_LIVE_BASE = "https://api.ransomware.live/v2"
RANSOMWARE_LIVE_URL = f"{RANSOMWARE_LIVE_BASE}/recentvictims"
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
    """Regular scheduled refresh. `/recentvictims` is a rolling recent-only
    window, so this is what keeps NEW incidents showing up live - it is not
    what backfills history. See fetch_ransomware_history() below for that.
    """
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


def fetch_ransomware_month(db, year: int, month: int) -> int:
    """Backfills every victim ransomware.live has on record for one calendar
    month, via GET /v2/victims/{year}/{month}. Records come back in the same
    shape as /recentvictims, so process_records() handles them unchanged.
    """
    url = f"{RANSOMWARE_LIVE_BASE}/victims/{year}/{month}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code == 404:
            return 0  # no data for this month (e.g. before their tracking began)
        resp.raise_for_status()
        data = resp.json()
        records = data if isinstance(data, list) else data.get("data", [])
        count = process_records(db, records)
        db.commit()
        return count
    except Exception as e:
        logger.exception("Error fetching ransomware.live victims for %s-%02d: %s", year, month, e)
        db.rollback()
        return 0


def fetch_ransomware_history(db, start_year: int = 2020, start_month: int = 1, delay_seconds: float = 1.0) -> int:
    """One-time (or occasionally re-run) historical backfill.

    Why this exists: the regular scheduled fetch_ransomware() only ever sees
    a rolling "recent" window. A country that isn't constantly making
    ransomware headlines (which, worldwide, is most countries) can easily
    have real, ransomware.live-documented incidents that are simply older
    than that window - so without this, they'd never enter the database and
    the country would look untouched on the map when it isn't. This walks
    every calendar month from start_year/start_month through the current
    month via the per-month endpoint and ingests everything found.

    Safe to re-run: process_records() upserts on
    (group_name, victim_name, published_at), so records already stored are
    skipped rather than duplicated - this is not a destructive operation.
    Also safe to interrupt (Ctrl+C): each month commits independently, so
    anything processed before the interrupt is already saved.

    Prints progress after every month (flushed immediately) rather than
    relying on the logging module - a several-minute script with no visible
    output looks hung even when it isn't, which is exactly what happened
    the first time this ran from a plain PowerShell prompt.
    """
    today = date.today()
    total_months = (today.year - start_year) * 12 + (today.month - start_month) + 1
    total = 0
    i = 0
    year, month = start_year, start_month
    while (year, month) <= (today.year, today.month):
        i += 1
        new_count = fetch_ransomware_month(db, year, month)
        total += new_count
        print(
            f"[{i}/{total_months}] {year}-{month:02d}: {new_count} new record(s) (running total: {total})",
            flush=True,
        )
        month += 1
        if month > 12:
            month = 1
            year += 1
        time.sleep(delay_seconds)  # be polite to a free, unauthenticated public API
    return total
