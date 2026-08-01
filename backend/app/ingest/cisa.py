"""CISA advisories (RSS) and Known Exploited Vulnerabilities (KEV) catalog ingestion."""
import logging
import requests
import feedparser
from app.models import Advisory, KEVEntry
from app.ingest.utils import struct_time_to_dt, parse_any_date, upsert

logger = logging.getLogger(__name__)

CISA_ADVISORIES_RSS = "https://www.cisa.gov/cybersecurity-advisories/all.xml"
CISA_KEV_JSON = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

HEADERS = {"User-Agent": "threatpulse/1.0 (personal research project)"}


def process_advisories_feed(db, parsed) -> int:
    """Upserts advisory entries from an already-parsed feedparser result. Testable offline."""
    new_count = 0
    for entry in parsed.entries:
        link = entry.get("link")
        if not link:
            continue
        published = struct_time_to_dt(entry.get("published_parsed") or entry.get("updated_parsed"))
        advisory_id = entry.get("id", "").split("/")[-1] if entry.get("id") else None
        inserted = upsert(
            db,
            Advisory,
            {"link": link},
            {
                "source": "CISA",
                "advisory_id": advisory_id,
                "title": entry.get("title", "(no title)")[:500],
                "published_at": published,
            },
        )
        if inserted:
            new_count += 1
    return new_count


def process_kev_json(db, data: dict) -> int:
    """Upserts KEV entries from an already-parsed JSON payload. Testable offline."""
    new_count = 0
    for v in data.get("vulnerabilities", []):
        cve_id = v.get("cveID")
        if not cve_id:
            continue
        inserted = upsert(
            db,
            KEVEntry,
            {"cve_id": cve_id},
            {
                "vendor_project": v.get("vendorProject"),
                "product": v.get("product"),
                "vulnerability_name": v.get("vulnerabilityName"),
                "date_added": parse_any_date(v.get("dateAdded")),
                "due_date": parse_any_date(v.get("dueDate")),
                "known_ransomware_use": v.get("knownRansomwareCampaignUse"),
                "notes": v.get("shortDescription") or v.get("notes"),
            },
        )
        if inserted:
            new_count += 1
    return new_count


def fetch_advisories(db) -> int:
    try:
        parsed = feedparser.parse(CISA_ADVISORIES_RSS)
        count = process_advisories_feed(db, parsed)
        db.commit()
        return count
    except Exception as e:
        logger.exception("Error fetching CISA advisories: %s", e)
        db.rollback()
        return 0


def fetch_kev(db) -> int:
    try:
        resp = requests.get(CISA_KEV_JSON, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        count = process_kev_json(db, resp.json())
        db.commit()
        return count
    except Exception as e:
        logger.exception("Error fetching CISA KEV catalog: %s", e)
        db.rollback()
        return 0
