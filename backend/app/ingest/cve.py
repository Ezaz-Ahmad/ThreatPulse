"""NVD CVE 2.0 API ingestion - pulls recently published/modified CVEs."""
import os
import time
import logging
from datetime import datetime, timedelta, timezone
import requests
from app.models import CVEEntry
from app.ingest.utils import parse_any_date, upsert

logger = logging.getLogger(__name__)

NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
LOOKBACK_DAYS = int(os.getenv("CVE_LOOKBACK_DAYS", "3"))


def _extract_score_severity(cve):
    metrics = cve.get("metrics", {})
    for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        entries = metrics.get(key)
        if entries:
            data = entries[0].get("cvssData", {})
            score = data.get("baseScore")
            severity = entries[0].get("baseSeverity") or data.get("baseSeverity")
            return score, severity
    return None, None


def process_cve_page(db, data: dict) -> int:
    """Upserts CVE entries from an already-parsed NVD API JSON page. Testable offline."""
    new_count = 0
    for item in data.get("vulnerabilities", []):
        cve = item.get("cve", {})
        cve_id = cve.get("id")
        if not cve_id:
            continue
        descriptions = cve.get("descriptions", [])
        desc_text = next((d["value"] for d in descriptions if d.get("lang") == "en"), None)
        score, severity = _extract_score_severity(cve)
        inserted = upsert(
            db,
            CVEEntry,
            {"cve_id": cve_id},
            {
                "description": (desc_text or "")[:2000],
                "cvss_score": score,
                "severity": severity,
                "published_at": parse_any_date(cve.get("published")),
                "source_url": f"https://nvd.nist.gov/vuln/detail/{cve_id}",
            },
        )
        if inserted:
            new_count += 1
    return new_count


def fetch_cves(db) -> int:
    new_count = 0
    api_key = os.getenv("NVD_API_KEY")
    headers = {"apiKey": api_key} if api_key else {}

    end = datetime.now(timezone.utc)
    start = end - timedelta(days=LOOKBACK_DAYS)
    params = {
        "lastModStartDate": start.strftime("%Y-%m-%dT%H:%M:%S.000%z").replace("+0000", "Z"),
        "lastModEndDate": end.strftime("%Y-%m-%dT%H:%M:%S.000%z").replace("+0000", "Z"),
        "resultsPerPage": 200,
        "startIndex": 0,
    }

    try:
        while True:
            resp = requests.get(NVD_API_URL, headers=headers, params=params, timeout=30)
            if resp.status_code == 403:
                logger.warning("NVD API rate-limited (403). Consider setting NVD_API_KEY. Stopping this run.")
                break
            resp.raise_for_status()
            data = resp.json()
            new_count += process_cve_page(db, data)
            db.commit()

            total_results = data.get("totalResults", 0)
            vulns = data.get("vulnerabilities", [])
            params["startIndex"] += params["resultsPerPage"]
            if params["startIndex"] >= total_results or not vulns:
                break
            time.sleep(1 if api_key else 6)  # be polite to the public rate limit
    except Exception as e:
        logger.exception("Error fetching NVD CVEs: %s", e)
        db.rollback()
    return new_count
