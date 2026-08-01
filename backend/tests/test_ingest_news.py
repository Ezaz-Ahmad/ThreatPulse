import feedparser
from app.ingest.news import process_feed
from app.models import NewsItem

SAMPLE_RSS = """<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test Feed</title>
<item>
  <title>Critical Zero-Day Found in Widely Used Library</title>
  <link>https://example.com/article-1</link>
  <description><![CDATA[<p>A newly discovered zero-day is being actively exploited.</p>]]></description>
  <pubDate>Mon, 20 Jul 2026 10:00:00 GMT</pubDate>
</item>
</channel></rss>"""


def test_process_feed_inserts_new_item(db_session):
    parsed = feedparser.parse(SAMPLE_RSS)
    count = process_feed(db_session, "Test Source", parsed)
    db_session.commit()
    assert count == 1

    item = db_session.query(NewsItem).one()
    assert item.title == "Critical Zero-Day Found in Widely Used Library"
    assert item.source == "Test Source"
    assert "zero-day" in item.summary.lower()
    assert "<p>" not in item.summary  # HTML stripped
    assert item.published_at is not None


def test_process_feed_dedupes_on_second_run(db_session):
    first = process_feed(db_session, "Test Source", feedparser.parse(SAMPLE_RSS))
    db_session.commit()
    second = process_feed(db_session, "Test Source", feedparser.parse(SAMPLE_RSS))
    db_session.commit()
    assert first == 1
    assert second == 0
    assert db_session.query(NewsItem).count() == 1
