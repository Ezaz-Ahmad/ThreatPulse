"""Orchestrates a full ingestion run across all sources."""
import logging
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models import IngestLog
from app.ingest.news import fetch_news
from app.ingest.cisa import fetch_advisories, fetch_kev
from app.ingest.cve import fetch_cves
from app.ingest.ransomware import fetch_ransomware

logger = logging.getLogger(__name__)

JOBS = [
    ("news", fetch_news),
    ("cisa_advisories", fetch_advisories),
    ("cisa_kev", fetch_kev),
    ("nvd_cves", fetch_cves),
    ("ransomware", fetch_ransomware),
]


def run_all_ingestion():
    """Runs every ingestion source, logging results. Safe to call repeatedly (idempotent upserts)."""
    summary = {}
    for name, fn in JOBS:
        db = SessionLocal()
        try:
            count = fn(db)
            summary[name] = count
            db.add(IngestLog(source=name, status="ok", new_records=count, ran_at=datetime.now(timezone.utc)))
            db.commit()
            logger.info("Ingested %s: %d new records", name, count)
        except Exception as e:
            db.rollback()
            db.add(IngestLog(source=name, status="error", detail=str(e), ran_at=datetime.now(timezone.utc)))
            db.commit()
            logger.exception("Ingestion job '%s' failed: %s", name, e)
            summary[name] = f"error: {e}"
        finally:
            db.close()
    return summary


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = run_all_ingestion()
    print(result)
