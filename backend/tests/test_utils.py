import time
from datetime import timezone
from app.ingest.utils import struct_time_to_dt, parse_any_date, upsert
from app.models import NewsItem


def test_struct_time_to_dt_converts_correctly():
    st = time.strptime("2026-07-15 10:30:00", "%Y-%m-%d %H:%M:%S")
    dt = struct_time_to_dt(st)
    assert dt.year == 2026 and dt.month == 7 and dt.day == 15
    assert dt.tzinfo == timezone.utc


def test_struct_time_to_dt_handles_none():
    assert struct_time_to_dt(None) is None


def test_parse_any_date_handles_iso_and_rfc822():
    assert parse_any_date("2026-07-15").year == 2026
    assert parse_any_date("Wed, 15 Jul 2026 10:00:00 GMT").year == 2026
    assert parse_any_date(None) is None
    assert parse_any_date("") is None


def test_upsert_inserts_once_and_skips_duplicate(db_session):
    inserted = upsert(db_session, NewsItem, {"link": "https://x/1"}, {"source": "A", "title": "T"})
    db_session.commit()
    assert inserted is True

    inserted_again = upsert(db_session, NewsItem, {"link": "https://x/1"}, {"source": "A", "title": "T changed"})
    db_session.commit()
    assert inserted_again is False
    assert db_session.query(NewsItem).count() == 1
