from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, PlainSerializer


def _to_utc_iso(dt: datetime) -> str:
    """Always serialize datetimes with an explicit UTC offset.

    SQLite (used in local dev) drops timezone info on round-trip, returning
    naive datetimes. Postgres (production) preserves it. Without this, a
    naive datetime serializes without a 'Z'/offset suffix, and browsers then
    parse it as *local* time instead of converting from UTC - silently
    shifting every timestamp on the dashboard. All datetimes stored by this
    app are UTC by convention (see models.now_utc), so a naive value here
    always means "this is UTC, the timezone info just got lost."
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


UTCDatetime = Annotated[datetime, PlainSerializer(_to_utc_iso, return_type=str)]


class NewsItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source: str
    title: str
    link: str
    summary: Optional[str] = None
    published_at: Optional[UTCDatetime] = None


class AdvisoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source: str
    advisory_id: Optional[str] = None
    title: str
    link: str
    published_at: Optional[UTCDatetime] = None


class CVEOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cve_id: str
    description: Optional[str] = None
    cvss_score: Optional[float] = None
    severity: Optional[str] = None
    published_at: Optional[UTCDatetime] = None
    source_url: Optional[str] = None


class KEVOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cve_id: str
    vendor_project: Optional[str] = None
    product: Optional[str] = None
    vulnerability_name: Optional[str] = None
    date_added: Optional[UTCDatetime] = None
    due_date: Optional[UTCDatetime] = None
    known_ransomware_use: Optional[str] = None
    notes: Optional[str] = None


class RansomwareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_name: str
    victim_name: str
    country: Optional[str] = None
    sector: Optional[str] = None
    published_at: Optional[UTCDatetime] = None
    link: Optional[str] = None


class IOCLookupRequest(BaseModel):
    indicator: str


class ScoreReason(BaseModel):
    source: str
    points: int
    reason: str


class AnalystGuidance(BaseModel):
    # "high" | "medium" | "low" | "none" - see app/ioc/rules/__init__.py
    priority: str
    actions: List[str]


class IOCLookupOut(BaseModel):
    indicator: str
    indicator_type: str
    verdict: str
    verdict_label: str
    risk_score: int
    confidence: str
    cached: bool
    fetched_at: Optional[UTCDatetime] = None
    sources: Dict[str, Any]
    correlation: Dict[str, Any]
    score_reasons: List[ScoreReason]
    analyst_guidance: AnalystGuidance


class IOCRecentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    indicator: str
    indicator_type: str
    risk_score: Optional[int] = None
    verdict: Optional[str] = None
    confidence: Optional[str] = None
    fetched_at: Optional[UTCDatetime] = None


class StatsOut(BaseModel):
    total_news: int
    total_advisories: int
    total_cves: int
    total_kev: int
    total_ransomware: int
    news_last_7_days: int
    ransomware_last_7_days: int
    kev_ransomware_flagged: int
    last_ingest_at: Optional[UTCDatetime] = None
