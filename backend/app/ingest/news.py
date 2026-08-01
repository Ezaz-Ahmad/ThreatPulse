"""RSS-based ingestion of cybersecurity news sites."""
import re
import logging
import feedparser
from app.models import NewsItem
from app.ingest.utils import struct_time_to_dt, upsert

logger = logging.getLogger(__name__)

# Well-known public RSS feeds for cybersecurity news.
FEEDS = {
    "The Hacker News": "https://feeds.feedburner.com/TheHackersNews",
    "BleepingComputer": "https://www.bleepingcomputer.com/feed/",
    "Krebs on Security": "https://krebsonsecurity.com/feed/",
    "Dark Reading": "https://www.darkreading.com/rss.xml",
    "SecurityWeek": "https://www.securityweek.com/feed/",
    "The Record": "https://therecord.media/feed",
}


def process_feed(db, source: str, parsed) -> int:
    """Takes an already-parsed feedparser result and upserts its entries.

    Split out from fetch_news() so it can be unit tested with a raw RSS/Atom
    string via feedparser.parse(xml_string) - no network access needed.
    """
    new_count = 0
    for entry in parsed.entries:
        link = entry.get("link")
        if not link:
            continue
        published = struct_time_to_dt(entry.get("published_parsed") or entry.get("updated_parsed"))
        summary = entry.get("summary", "")
        if summary:
            summary = re.sub(r"<[^>]+>", "", summary).strip()[:1000]
        inserted = upsert(
            db,
            NewsItem,
            {"link": link},
            {
                "source": source,
                "title": entry.get("title", "(no title)")[:500],
                "summary": summary,
                "published_at": published,
            },
        )
        if inserted:
            new_count += 1
    return new_count


def fetch_news(db) -> int:
    """Fetch all configured RSS feeds and store new items. Returns number of new rows."""
    new_count = 0
    for source, url in FEEDS.items():
        try:
            parsed = feedparser.parse(url)
            if parsed.bozo and not parsed.entries:
                logger.warning("Feed %s failed to parse: %s", source, parsed.get("bozo_exception"))
                continue
            new_count += process_feed(db, source, parsed)
            db.commit()
        except Exception as e:
            logger.exception("Error fetching feed %s: %s", source, e)
            db.rollback()
    return new_count
