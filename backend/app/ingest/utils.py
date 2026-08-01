import calendar
from datetime import datetime, timezone
from dateutil import parser as dateparser


def struct_time_to_dt(struct_time):
    """Convert feedparser's time.struct_time (UTC) to a timezone-aware datetime."""
    if struct_time is None:
        return None
    try:
        return datetime.fromtimestamp(calendar.timegm(struct_time), tz=timezone.utc)
    except Exception:
        return None


def parse_any_date(value):
    """Best-effort parse of a date string (ISO, RFC822, etc.) to aware UTC datetime."""
    if not value:
        return None
    try:
        dt = dateparser.parse(value)
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def upsert(db, model, unique_filter: dict, values: dict):
    """Insert a row if it doesn't already exist (matched on unique_filter). Returns True if inserted."""
    existing = db.query(model).filter_by(**unique_filter).first()
    if existing:
        return False
    row = model(**{**unique_filter, **values})
    db.add(row)
    return True
