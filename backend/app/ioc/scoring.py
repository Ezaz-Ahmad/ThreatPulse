"""Explainable risk scoring for an IOC lookup.

Deliberately additive and simple (a handful of transparent point rules,
capped at 100) rather than a black-box model — every point on the score maps
to one line in `score_reasons`, so an analyst can see exactly why a number
was assigned instead of trusting it blindly. This mirrors real reputation
tools (AbuseIPDB, VirusTotal) which score the same way for the same reason.
"""

_VERDICTS = [
    (70, "strong_malicious_indicators", "Strong malicious indicators"),
    (40, "moderate_risk_indicators", "Moderate risk indicators"),
    (15, "low_risk_indicators", "Low-confidence indicators"),
    (0, "no_significant_indicators", "No significant indicators found"),
]

_ACTION_TEMPLATES = {
    "ipv4": [
        "Search proxy, firewall and DNS logs for other internal systems communicating with this IP.",
        "Review the timestamps and transferred data volume for related connections.",
        "Check affected endpoints for suspicious processes, persistence and authentication activity.",
        "Consider blocking the indicator only after validating business context and internal evidence.",
    ],
    "domain": [
        "Search DNS and proxy logs for other internal systems resolving or contacting this domain.",
        "Review the timestamps of related lookups and any data transferred to the domain.",
        "Check affected endpoints for suspicious processes, persistence and authentication activity.",
        "Consider blocking the indicator only after validating business context and internal evidence.",
    ],
    "url": [
        "Search proxy and web-gateway logs for other requests to this URL or its host.",
        "Review the timestamps and any files downloaded from the URL.",
        "Check affected endpoints for suspicious processes, persistence and authentication activity.",
        "Consider blocking the indicator only after validating business context and internal evidence.",
    ],
    "hash": [
        "Search EDR/AV logs for other endpoints where this file hash has been observed.",
        "Review process execution history and parent processes around the time it appeared.",
        "Check affected endpoints for persistence, lateral movement and authentication activity.",
        "Consider isolating affected endpoints only after validating business context and internal evidence.",
    ],
}

_BASE_GUIDANCE = [
    "Search internal firewall, proxy and DNS logs",
    "Identify all systems that contacted the indicator",
    "Review activity before and after the connection",
    "Validate external intelligence against internal evidence",
    "Do not treat the external score alone as proof of compromise",
]


def _verdict_for(score: int):
    for threshold, key, label in _VERDICTS:
        if score >= threshold:
            return key, label
    return _VERDICTS[-1][1], _VERDICTS[-1][2]


def score_lookup(sources: dict, correlation: dict) -> dict:
    """Compute risk_score, verdict, confidence and score_reasons from provider results."""
    reasons = []
    score = 0

    abuse = sources.get("abuseipdb", {})
    if abuse.get("status") == "success":
        conf = abuse.get("abuse_confidence_score", 0) or 0
        if conf > 75:
            score += 30
            reasons.append({"source": "AbuseIPDB", "points": 30, "reason": "Abuse confidence score exceeded 75%"})
        elif conf > 25:
            score += 15
            reasons.append({"source": "AbuseIPDB", "points": 15, "reason": "Abuse confidence score above 25%"})

    vt = sources.get("virustotal", {})
    if vt.get("status") == "success":
        malicious = vt.get("malicious", 0) or 0
        suspicious = vt.get("suspicious", 0) or 0
        if malicious >= 5:
            score += 35
            reasons.append({"source": "VirusTotal", "points": 35, "reason": "Multiple engines classified the indicator as malicious"})
        elif malicious >= 1:
            score += 15
            reasons.append({"source": "VirusTotal", "points": 15, "reason": "At least one engine classified the indicator as malicious"})
        elif suspicious >= 1:
            score += 5
            reasons.append({"source": "VirusTotal", "points": 5, "reason": "Flagged as suspicious by at least one engine"})

    otx = sources.get("otx", {})
    if otx.get("status") == "success":
        pulses = otx.get("pulse_count", 0) or 0
        if pulses >= 5:
            score += 10
            reasons.append({"source": "AlienVault OTX", "points": 10, "reason": f"Associated with {pulses} threat-intelligence pulses"})
        elif pulses >= 1:
            score += 5
            reasons.append({"source": "AlienVault OTX", "points": 5, "reason": f"Appeared in {pulses} threat-intelligence pulse(s)"})

    urlhaus = sources.get("urlhaus", {})
    if urlhaus.get("status") == "success":
        score += 20
        reasons.append({"source": "URLhaus", "points": 20, "reason": "Found in the URLhaus known-malware database"})

    if correlation.get("status") == "success":
        mentions = correlation.get("mention_count", 0) or 0
        points = min(9 + (mentions - 1) * 3, 20) if mentions else 0
        if points:
            score += points
            reasons.append({
                "source": "ThreatPulse",
                "points": points,
                "reason": "The indicator was connected to recent threat reporting",
            })

    score = min(score, 100)
    verdict_key, verdict_label = _verdict_for(score)

    attempted = [s for s in sources.values() if s.get("status") != "unsupported_type"]
    answered = [s for s in attempted if s.get("status") in ("success", "no_match")]
    if not attempted:
        confidence = "low"
    else:
        ratio = len(answered) / len(attempted)
        confidence = "high" if ratio >= 0.75 else "medium" if ratio >= 0.5 else "low"

    return {
        "risk_score": score,
        "verdict": verdict_key,
        "verdict_label": verdict_label,
        "confidence": confidence,
        "score_reasons": reasons,
    }


_TEMPLATE_KEY_ALIASES = {"md5": "hash", "sha1": "hash", "sha256": "hash"}


def analyst_guidance_for(indicator_type: str) -> list:
    template_key = _TEMPLATE_KEY_ALIASES.get(indicator_type, indicator_type)
    type_specific = _ACTION_TEMPLATES.get(template_key, _ACTION_TEMPLATES["ipv4"])
    # Base guidance mirrors the spec's example JSON; type-specific guidance
    # gives the analyst something concrete to act on immediately.
    return type_specific + _BASE_GUIDANCE
