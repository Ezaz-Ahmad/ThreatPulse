"""Concurrent queries against external threat-intel providers.

Each provider function takes the normalized indicator + its type and returns
a small status dict — never raises. A provider that isn't supported for the
given indicator type reports "unsupported_type"; a provider with no API key
configured reports "not_configured"; a network/API error reports "error" with
a short detail string. One provider failing never blocks the others — that's
enforced by running everything through a ThreadPoolExecutor and catching
exceptions per-future in query_all().

Note: all four providers require a free API key as of this writing. URLhaus
used to be keyless, but abuse.ch made Auth-Key mandatory across their APIs
in June 2025 - see query_urlhaus() below.
"""
import base64
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 8
# OTX's API is consistently slower to respond than the other three providers
# - 8s was tight enough to time out under normal conditions, not just when
# something was actually wrong.
OTX_REQUEST_TIMEOUT = 20
_UNSUPPORTED = {"status": "unsupported_type"}


def _get_key(env_var: str):
    val = os.getenv(env_var)
    return val.strip() if val and val.strip() else None


# ---------------------------------------------------------------- AbuseIPDB

def query_abuseipdb(indicator: str, indicator_type: str) -> dict:
    if indicator_type != "ipv4":
        return dict(_UNSUPPORTED)
    key = _get_key("ABUSEIPDB_API_KEY")
    if not key:
        return {"status": "not_configured"}
    try:
        resp = requests.get(
            "https://api.abuseipdb.com/api/v2/check",
            params={"ipAddress": indicator, "maxAgeInDays": 90},
            headers={"Key": key, "Accept": "application/json"},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})
        confidence = data.get("abuseConfidenceScore", 0) or 0
        reports = data.get("totalReports", 0) or 0
        return {
            # A 200 response with 0% confidence and 0 reports means AbuseIPDB
            # was reachable and has this IP on file with a clean history -
            # that's a real finding ("no_match"), not the same thing as
            # actually finding abuse reports ("success").
            "status": "success" if (confidence > 0 or reports > 0) else "no_match",
            "abuse_confidence_score": confidence,
            "total_reports": reports,
            "last_reported_at": data.get("lastReportedAt"),
        }
    except Exception as exc:  # noqa: BLE001 - one bad provider must not break the lookup
        logger.warning("AbuseIPDB lookup failed for %s: %s", indicator, exc)
        return {"status": "error", "detail": str(exc)}


# --------------------------------------------------------------- VirusTotal

def query_virustotal(indicator: str, indicator_type: str) -> dict:
    key = _get_key("VIRUSTOTAL_API_KEY")
    if not key:
        return {"status": "not_configured"}

    if indicator_type == "ipv4":
        url = f"https://www.virustotal.com/api/v3/ip_addresses/{indicator}"
    elif indicator_type == "domain":
        url = f"https://www.virustotal.com/api/v3/domains/{indicator}"
    elif indicator_type == "url":
        url_id = base64.urlsafe_b64encode(indicator.encode()).decode().strip("=")
        url = f"https://www.virustotal.com/api/v3/urls/{url_id}"
    elif indicator_type in ("md5", "sha1", "sha256"):
        url = f"https://www.virustotal.com/api/v3/files/{indicator}"
    else:
        return dict(_UNSUPPORTED)

    try:
        resp = requests.get(url, headers={"x-apikey": key}, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 404:
            return {"status": "no_match"}
        resp.raise_for_status()
        attributes = resp.json()["data"]["attributes"]
        stats = attributes["last_analysis_stats"]
        malicious = stats.get("malicious", 0) or 0
        suspicious = stats.get("suspicious", 0) or 0
        result = {
            # VT knowing about the indicator and every engine calling it clean
            # is a real (clean) finding - it's not the same as an engine
            # actually flagging it, which is what "success" should mean here.
            "status": "success" if (malicious > 0 or suspicious > 0) else "no_match",
            "malicious": malicious,
            "suspicious": suspicious,
            "harmless": stats.get("harmless", 0),
        }
        # File reports carry a best-guess malware family label - this is what
        # lets the recommendation engine give family-specific guidance (e.g.
        # "Lumma Stealer" -> credential-theft actions) instead of generic
        # hash advice. Not present for IP/domain/URL reports.
        if indicator_type in ("md5", "sha1", "sha256"):
            classification = attributes.get("popular_threat_classification") or {}
            family = classification.get("suggested_threat_label")
            if family:
                result["malware_family"] = family
        return result
    except Exception as exc:  # noqa: BLE001
        logger.warning("VirusTotal lookup failed for %s: %s", indicator, exc)
        return {"status": "error", "detail": str(exc)}


# ---------------------------------------------------------- AlienVault OTX

_OTX_SECTION = {
    "ipv4": "IPv4",
    "domain": "domain",
    "md5": "file",
    "sha1": "file",
    "sha256": "file",
    "url": "url",
}


def query_otx(indicator: str, indicator_type: str) -> dict:
    section = _OTX_SECTION.get(indicator_type)
    if section is None:
        return dict(_UNSUPPORTED)
    key = _get_key("OTX_API_KEY")
    if not key:
        return {"status": "not_configured"}
    try:
        # For URLs and hashes OTX's REST path expects the raw value URL-encoded
        # by requests itself, so we let it build the path via params-free GET.
        safe_indicator = requests.utils.quote(indicator, safe="")
        url = f"https://otx.alienvault.com/api/v1/indicators/{section}/{safe_indicator}/general"
        headers = {"X-OTX-API-KEY": key}

        # OTX's API intermittently 500s on individual indicators rather than
        # returning a clean empty result - one retry clears most of these
        # without masking a real, persistent failure.
        resp = requests.get(url, headers=headers, timeout=OTX_REQUEST_TIMEOUT)
        if resp.status_code >= 500:
            time.sleep(1)
            resp = requests.get(url, headers=headers, timeout=OTX_REQUEST_TIMEOUT)

        if resp.status_code == 404:
            return {"status": "no_match"}
        resp.raise_for_status()
        pulse_count = resp.json().get("pulse_info", {}).get("count", 0)
        return {
            "status": "success" if pulse_count else "no_match",
            "pulse_count": pulse_count,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("OTX lookup failed for %s: %s", indicator, exc)
        return {"status": "error", "detail": str(exc)}


# ------------------------------------------------------------------ URLhaus

def query_urlhaus(indicator: str, indicator_type: str) -> dict:
    # abuse.ch made Auth-Key mandatory on all their APIs from June 2025
    # onward (previously URLhaus was fully keyless). Free at auth.abuse.ch -
    # same account works for URLhaus/MalwareBazaar/ThreatFox.
    key = _get_key("URLHAUS_AUTH_KEY")
    if not key:
        return {"status": "not_configured"}
    headers = {"Auth-Key": key}
    try:
        if indicator_type == "url":
            resp = requests.post(
                "https://urlhaus-api.abuse.ch/v1/url/",
                data={"url": indicator},
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )
        elif indicator_type in ("ipv4", "domain"):
            resp = requests.post(
                "https://urlhaus-api.abuse.ch/v1/host/",
                data={"host": indicator},
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )
        elif indicator_type in ("md5", "sha256"):
            # URLhaus's payload endpoint only indexes MD5/SHA256 - it has no
            # SHA1 field, so a SHA1 hash falls through to "unsupported_type"
            # below rather than being sent as the wrong field.
            field = "sha256_hash" if indicator_type == "sha256" else "md5_hash"
            resp = requests.post(
                "https://urlhaus-api.abuse.ch/v1/payload/",
                data={field: indicator},
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )
        else:
            return dict(_UNSUPPORTED)

        resp.raise_for_status()
        body = resp.json()
        if body.get("query_status") != "ok":
            return {"status": "no_match"}
        url_count = len(body.get("urls", [])) if "urls" in body else 1
        return {"status": "success", "matches": url_count}
    except Exception as exc:  # noqa: BLE001
        logger.warning("URLhaus lookup failed for %s: %s", indicator, exc)
        return {"status": "error", "detail": str(exc)}


PROVIDERS = {
    "abuseipdb": query_abuseipdb,
    "virustotal": query_virustotal,
    "otx": query_otx,
    "urlhaus": query_urlhaus,
}


def query_all(indicator: str, indicator_type: str) -> dict:
    """Query every provider concurrently. Returns {provider_name: result_dict}.

    A provider raising unexpectedly (bug, unexpected response shape) is
    caught here too, on top of each function's own try/except, so a single
    bad provider can never take down the whole lookup.
    """
    results = {}
    with ThreadPoolExecutor(max_workers=len(PROVIDERS)) as pool:
        futures = {
            pool.submit(func, indicator, indicator_type): name
            for name, func in PROVIDERS.items()
        }
        for future in as_completed(futures):
            name = futures[future]
            try:
                results[name] = future.result()
            except Exception as exc:  # noqa: BLE001
                logger.exception("Unexpected error querying %s", name)
                results[name] = {"status": "error", "detail": str(exc)}
    return results
