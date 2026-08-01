"""One-time historical backfill for ransomware victim data.

Why this exists: the regular scheduled refresh (app.ingest.ransomware.
fetch_ransomware) only ever pulls ransomware.live's /recentvictims feed,
which is a rolling recent-only window. That's fine for "did anything new
happen today" but it means a country that isn't constantly making
ransomware headlines - which, worldwide, is most countries - can have real,
already-documented incidents on ransomware.live that are simply older than
that window, and they'd never make it into our database. On the map that
shows up as "this country has had zero attacks," which isn't true - it's
just "our recent-only feed never covered it." This script fixes that by
walking ransomware.live's per-month endpoint across the years, once.

It's safe to re-run: inserts are upserts keyed on
(group_name, victim_name, published_at), so anything already stored is
skipped rather than duplicated.

Usage (run from the backend/ directory, same as the other ingest modules):

    python -m app.ingest.backfill_history                # Jan 2020 -> now
    python -m app.ingest.backfill_history 2022 6          # Jun 2022 -> now

To backfill your PRODUCTION database instead of local SQLite, set
DATABASE_URL to your Postgres connection string first (e.g. copy it from
Render's environment settings), then run the same command:

    DATABASE_URL="postgresql://..." python -m app.ingest.backfill_history

This can take a few minutes - it's making one request per calendar month
with a short delay between each, out of courtesy to a free public API.
"""
import logging
import sys

from app.database import SessionLocal
from app.ingest.ransomware import fetch_ransomware_history

logger = logging.getLogger(__name__)


def main():
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s %(levelname)s %(message)s")

    start_year = int(sys.argv[1]) if len(sys.argv) > 1 else 2020
    start_month = int(sys.argv[2]) if len(sys.argv) > 2 else 1

    print(f"Backfilling ransomware history from {start_year}-{start_month:02d} to today...")
    print("This prints one line per month as it goes - if it looks quiet for a")
    print("few seconds between lines, that's normal (one request per month).\n")

    db = SessionLocal()
    try:
        total = fetch_ransomware_history(db, start_year=start_year, start_month=start_month)
        print(f"\nBackfill complete: {total} new record(s) added.")
    except KeyboardInterrupt:
        print("\nInterrupted - that's fine, every month already processed was saved.")
        print("Re-run the same command any time to pick up where this left off")
        print("(already-stored records are skipped, not duplicated).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
