"""Explainable risk scoring for an IOC lookup.

Deliberately additive and simple (a handful of transparent point rules,
capped at 100) rather than a black-box model — every point on the score maps
to one line in `score_reasons`, so an analyst can see exactly why a number
was assigned instead of trusting it blindly. This mirrors real reputation
tools (AbuseIPDB, VirusTotal) which score the same way for the same reason.

Recommended analyst actions are handled separately, by app/ioc/rules/ - this
module only decides *how risky* an indicator looks, not *what to do about
it*. The two are linked by verdict: rules.priority_for_verdict() maps the
same verdict keys defined below to a priority tier.

Score vs. classification vs. priority
--------------------------------------
These are three different things and this module is careful to keep them
that way (see _evidence_override below for why that distinction matters):

  - risk_score: the raw, additive point total from provider signals. Never
    adjusted by the override logic - it stays an honest sum an analyst can
    re-derive by hand from score_reasons.
  - verdict / verdict_label: the human-facing classification. Normally
    derived purely from risk_score via _VERDICTS, but can be escalated by
    _evidence_override() when corroborating evidence is strong enough that
    treating the indicator as anything less than "strong" would be
    misleading - most commonly when ThreatPulse's own database simply
    hasn't ingested the indicator before, capping the achievable score,
    even though external providers agree it's confirmed malicious.
  - priority: derived from verdict by rules.priority_for_verdict(), so an
    escalated verdict automatically escalates response priority too.
"""

_VERDICTS = [
    (70, "strong_malicious_indicators", "Strong malicious indicators"),
    (40, "moderate_risk_indicators", "Moderate risk indicators"),
    (15, "low_risk_indicators", "Low-confidence indicators"),
    (0, "no_significant_indicators", "No significant indicators found"),
]

# The EICAR test file is a standardized, publicly-published byte string every
# AV/EDR engine is deliberately built to flag - that's its entire purpose
# (see https://www.eicar.org/download-anti-malware-testfile/). Every provider
# "agreeing" it's malicious is expected behaviour, not corroborating evidence
# of a real threat, so it must never reach the normal scoring/override path -
# high detection counts there would otherwise trigger strong_malicious_
# indicators exactly the way real confirmed malware does. Hashes are the
# canonical EICAR test string in each digest format (stable, publicly known,
# never change - this isn't a moving detection signature).
_EICAR_HASHES = {
    "44d88612fea8a8f36de82e1278abb02f",  # MD5
    "3395856ce81f2b7382dee72602f798b642f14140",  # SHA1
    "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0",  # SHA256
}


def _is_eicar_test_file(indicator: str, sources: dict) -> bool:
    if indicator and indicator.lower() in _EICAR_HASHES:
        return True
    # Fallback for cases the hash allowlist misses (e.g. a modified/repacked
    # EICAR variant) - VirusTotal's own classification reliably names it.
    family = (sources.get("virustotal", {}).get("malware_family") or "").lower()
    return "eicar" in family


# External providers whose "success" status represents an independent
# positive match on the indicator (as opposed to a clean/no-match result,
# or a provider that wasn't configured/didn't support this indicator type).
# ThreatPulse's own internal correlation is deliberately excluded - the
# whole point of the override below is that its *absence* shouldn't cap the
# classification of an indicator every external provider agrees is malicious.
_EXTERNAL_PROVIDERS = ("abuseipdb", "virustotal", "otx", "urlhaus")


def _verdict_for(score: int):
    for threshold, key, label in _VERDICTS:
        if score >= threshold:
            return key, label
    return _VERDICTS[-1][1], _VERDICTS[-1][2]


def _provider_match_count(sources: dict) -> int:
    return sum(1 for name in _EXTERNAL_PROVIDERS if sources.get(name, {}).get("status") == "success")


def _evidence_override(verdict_key: str, verdict_label: str, sources: dict):
    """Escalate the classification (and, through it, response priority) when
    provider evidence is strong enough on its own - independent of whether
    the numeric score happened to clear the "strong" threshold.

    This exists because risk_score is capped by whichever providers actually
    responded: an indicator ThreatPulse has never ingested before can only
    earn points from the four external providers, topping out around 65
    even when every one of them agrees it's a known ransomware family.
    Internal absence means "not previously ingested," not "less malicious" -
    it should never by itself hold back a confirmed-malicious classification.

    Returns (verdict_key, verdict_label, reason). reason is None when no
    override condition is met.
    """
    if verdict_key == "strong_malicious_indicators":
        return verdict_key, verdict_label, None  # already at the top tier

    vt = sources.get("virustotal", {})
    vt_malicious = vt.get("malicious", 0) or 0
    family = vt.get("malware_family")
    urlhaus_match = sources.get("urlhaus", {}).get("status") == "success"
    matches = _provider_match_count(sources)

    if family and matches >= 2:
        return (
            "strong_malicious_indicators",
            f"Strong malicious indicators — confirmed {family}",
            f'VirusTotal identified this as "{family}" and {matches} independent '
            "providers corroborated it — treated as confirmed malicious regardless "
            "of the numeric score.",
        )
    if vt_malicious >= 20 and matches >= 2:
        return (
            "strong_malicious_indicators",
            "Strong malicious indicators — high provider agreement",
            f"VirusTotal recorded {vt_malicious} malicious detections, corroborated "
            "by at least one other independent provider.",
        )
    if vt_malicious >= 40 or urlhaus_match:
        reason = (
            f"VirusTotal recorded {vt_malicious} malicious detections."
            if vt_malicious >= 40
            else "Found in the URLhaus known-malware database, a curated confirmed-malicious dataset."
        )
        return "strong_malicious_indicators", "Strong malicious indicators", reason

    return verdict_key, verdict_label, None


def score_lookup(sources: dict, correlation: dict, indicator: str = None) -> dict:
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

    if _is_eicar_test_file(indicator, sources):
        # Deliberately bypasses _evidence_override entirely - EICAR is
        # designed to trigger every provider's malicious signal at once,
        # which is exactly the corroboration pattern that override escalates
        # on. Treating it as confirmed malware here would be the same
        # mistake in the opposite direction.
        verdict_key = "security_test_artifact"
        verdict_label = "Known security-testing artifact — EICAR test file"
        reasons.append({
            "source": "EICAR detection",
            "points": 0,
            "reason": "This is the standard EICAR antivirus test file, not real malware. "
                      "Every AV/EDR engine is intentionally built to flag this exact byte "
                      "string, so a high detection count here is expected, not evidence of a threat.",
        })
    else:
        # Evidence override: may raise the classification above what the raw
        # score alone would justify (e.g. score capped at 65 purely because
        # ThreatPulse had no prior record). risk_score itself is never
        # touched - only verdict_key/verdict_label, and (via
        # rules.priority_for_verdict()) response priority downstream. See
        # _evidence_override's docstring.
        verdict_key, verdict_label, override_reason = _evidence_override(verdict_key, verdict_label, sources)
        if override_reason:
            reasons.append({"source": "Classification override", "points": 0, "reason": override_reason})

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
