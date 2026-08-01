from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NewsItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source: str
    title: str
    link: str
    summary: Optional[str] = None
    published_at: Optional[datetime] = None


class AdvisoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source: str
    advisory_id: Optional[str] = None
    title: str
    link: str
    published_at: Optional[datetime] = None


class CVEOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cve_id: str
    description: Optional[str] = None
    cvss_score: Optional[float] = None
    severity: Optional[str] = None
    published_at: Optional[datetime] = None
    source_url: Optional[str] = None


class KEVOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cve_id: str
    vendor_project: Optional[str] = None
    product: Optional[str] = None
    vulnerability_name: Optional[str] = None
    date_added: Optional[datetime] = None
    due_date: Optional[datetime] = None
    known_ransomware_use: Optional[str] = None
    notes: Optional[str] = None


class RansomwareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_name: str
    victim_name: str
    country: Optional[str] = None
    sector: Optional[str] = None
    published_at: Optional[datetime] = None
    link: Optional[str] = None


class StatsOut(BaseModel):
    total_news: int
    total_advisories: int
    total_cves: int
    total_kev: int
    total_ransomware: int
    news_last_7_days: int
    ransomware_last_7_days: int
    kev_ransomware_flagged: int
    last_ingest_at: Optional[datetime] = None
