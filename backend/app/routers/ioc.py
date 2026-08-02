"""IOC (Indicator of Compromise) Lookup.

A SOC analyst pastes a suspicious IP, domain, URL, or file hash and gets
back one consolidated report: multi-source reputation data (AbuseIPDB,
VirusTotal, AlienVault OTX, URLhaus), correlation against ThreatPulse's own
ingested intelligence, an explainable risk score, and recommended next
investigation steps. See app/ioc/ for the validation, provider, correlation
and scoring logic this endpoint wires together.
"""
import json
import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import IOCLookup
from app.schemas import IOCLookupOut, IOCLookupRequest, IOCRecentOut
from app.ioc.validators import identify_ioc, InvalidIOCError
from app.ioc.providers import query_all
from app.ioc.correlate import correlate
from app.ioc.scoring import score_lookup
from app.ioc.rules import generate_recommendations, priority_for_verdict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ioc", tags=["ioc"])

CACHE_TTL_MINUTES = int(os.getenv("IOC_CACHE_TTL_MINUTES", "60"))


def _stringify_dates(obj):
    """Recursively convert datetime values to UTC ISO strings for JSON storage/output."""
    if isinstance(obj, datetime):
        dt = obj if obj.tzinfo else obj.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    if isinstance(obj, dict):
        return {k: _stringify_dates(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_stringify_dates(v) for v in obj]
    return obj


def _parse_guidance(raw_json: str, verdict: str) -> dict:
    """Parse the stored analyst_guidance JSON, tolerating the pre-rule-engine
    format (a flat list of strings) for rows cached before this feature
    shipped - those get wrapped into the new {priority, actions} shape
    instead of breaking on the next cache read.
    """
    parsed = json.loads(raw_json or "[]")
    if isinstance(parsed, list):
        return {"priority": priority_for_verdict(verdict), "actions": parsed}
    return parsed


def _row_to_report(row: IOCLookup, cached: bool) -> dict:
    return {
        "indicator": row.indicator,
        "indicator_type": row.indicator_type,
        "verdict": row.verdict,
        "verdict_label": row.verdict_label or row.verdict,
        "risk_score": row.risk_score,
        "confidence": row.confidence,
        "cached": cached,
        "fetched_at": row.fetched_at,
        "sources": json.loads(row.sources_json or "{}"),
        "correlation": json.loads(row.correlation_json or "{}"),
        "score_reasons": json.loads(row.score_reasons_json or "[]"),
        "analyst_guidance": _parse_guidance(row.analyst_guidance_json, row.verdict),
    }


@router.post("/lookup", response_model=IOCLookupOut)
def lookup_ioc(payload: IOCLookupRequest, db: Session = Depends(get_db)):
    try:
        indicator_type, indicator = identify_ioc(payload.indicator)
    except InvalidIOCError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    cache_cutoff = datetime.now(timezone.utc) - timedelta(minutes=CACHE_TTL_MINUTES)
    existing = db.query(IOCLookup).filter(IOCLookup.indicator == indicator).first()
    if existing and existing.fetched_at and existing.fetched_at.replace(tzinfo=timezone.utc) >= cache_cutoff:
        return _row_to_report(existing, cached=True)

    # No fresh cached result - enrich from scratch.
    sources = query_all(indicator, indicator_type)
    correlation = _stringify_dates(correlate(db, indicator))
    sources["threatpulse"] = {
        "status": correlation["status"],
        "mention_count": correlation["mention_count"],
    }

    scored = score_lookup(sources, correlation)
    guidance = generate_recommendations(indicator_type, scored["verdict"], sources, correlation)
    fetched_at = datetime.now(timezone.utc)

    if existing:
        row = existing
    else:
        row = IOCLookup(indicator=indicator, indicator_type=indicator_type)
        db.add(row)

    row.indicator_type = indicator_type
    row.risk_score = scored["risk_score"]
    row.verdict = scored["verdict"]
    row.verdict_label = scored["verdict_label"]
    row.confidence = scored["confidence"]
    row.sources_json = json.dumps(sources)
    row.score_reasons_json = json.dumps(scored["score_reasons"])
    row.analyst_guidance_json = json.dumps(guidance)
    row.correlation_json = json.dumps(correlation)
    row.fetched_at = fetched_at
    db.commit()
    db.refresh(row)

    return {
        "indicator": indicator,
        "indicator_type": indicator_type,
        "verdict": scored["verdict"],
        "verdict_label": scored["verdict_label"],
        "risk_score": scored["risk_score"],
        "confidence": scored["confidence"],
        "cached": False,
        "fetched_at": fetched_at,
        "sources": sources,
        "correlation": correlation,
        "score_reasons": scored["score_reasons"],
        "analyst_guidance": guidance,
    }


@router.get("/recent", response_model=list[IOCRecentOut])
def recent_lookups(db: Session = Depends(get_db), limit: int = Query(10, le=50)):
    return (
        db.query(IOCLookup)
        .order_by(IOCLookup.fetched_at.desc())
        .limit(limit)
        .all()
    )
