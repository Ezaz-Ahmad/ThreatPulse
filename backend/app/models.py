from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, UniqueConstraint
from app.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class NewsItem(Base):
    __tablename__ = "news_items"
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(100), index=True)
    title = Column(String(500))
    link = Column(String(1000), unique=True, index=True)
    summary = Column(Text, nullable=True)
    published_at = Column(DateTime, nullable=True, index=True)
    fetched_at = Column(DateTime, default=now_utc)


class Advisory(Base):
    __tablename__ = "advisories"
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(100), default="CISA")
    advisory_id = Column(String(100), nullable=True)
    title = Column(String(500))
    link = Column(String(1000), unique=True, index=True)
    published_at = Column(DateTime, nullable=True, index=True)
    fetched_at = Column(DateTime, default=now_utc)


class CVEEntry(Base):
    __tablename__ = "cve_entries"
    id = Column(Integer, primary_key=True, index=True)
    cve_id = Column(String(30), unique=True, index=True)
    description = Column(Text, nullable=True)
    cvss_score = Column(Float, nullable=True)
    severity = Column(String(20), nullable=True)
    published_at = Column(DateTime, nullable=True, index=True)
    source_url = Column(String(500), nullable=True)
    fetched_at = Column(DateTime, default=now_utc)


class KEVEntry(Base):
    __tablename__ = "kev_entries"
    id = Column(Integer, primary_key=True, index=True)
    cve_id = Column(String(30), unique=True, index=True)
    vendor_project = Column(String(200), nullable=True)
    product = Column(String(200), nullable=True)
    vulnerability_name = Column(String(500), nullable=True)
    date_added = Column(DateTime, nullable=True, index=True)
    due_date = Column(DateTime, nullable=True)
    known_ransomware_use = Column(String(10), nullable=True)
    notes = Column(Text, nullable=True)
    fetched_at = Column(DateTime, default=now_utc)


class RansomwareVictim(Base):
    __tablename__ = "ransomware_victims"
    id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String(200), index=True)
    victim_name = Column(String(300))
    country = Column(String(10), nullable=True)
    sector = Column(String(200), nullable=True)
    published_at = Column(DateTime, nullable=True, index=True)
    link = Column(String(1000), nullable=True)
    fetched_at = Column(DateTime, default=now_utc)

    __table_args__ = (
        UniqueConstraint("group_name", "victim_name", "published_at", name="uq_ransomware_entry"),
    )


class IngestLog(Base):
    __tablename__ = "ingest_log"
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(100))
    status = Column(String(20))
    detail = Column(Text, nullable=True)
    new_records = Column(Integer, default=0)
    ran_at = Column(DateTime, default=now_utc)
