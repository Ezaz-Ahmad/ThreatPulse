"""Rule-based "Recommended Analyst Actions" generator.

Deliberately not AI-generated: the guidance is deterministic, testable, and
each line traces back to an explicit rule (see docs/module comments below),
which matters for a SOC tool where an analyst needs to trust *why* a
suggestion showed up. An optional AI-generated summary could sit on top of
this later, but this rule engine stays the source of truth.

Recommendations are assembled from up to three layers:
  1. Type + priority base guidance (ip_rules / domain_rules / url_rules /
     hash_rules) - what matters structurally differs by indicator type (an
     IP points investigators at firewall/proxy logs, a domain at DNS/email,
     a hash at EDR/quarantine).
  2. Malware-family-specific guidance (malware_rules) - only for file hashes
     where VirusTotal returned a recognizable family label.
  3. Ransomware-group-specific guidance (ransomware_rules) - for any
     indicator type, when it's tied to a group ThreatPulse has ingested
     victim postings for.

Priority is derived from the same verdict tiers scoring.py already computes
(see app/ioc/scoring.py's _VERDICTS) so the two stay in lockstep - a "strong
malicious indicators" verdict always means "high priority" actions.
"""
from app.ioc.rules import ip_rules, domain_rules, url_rules, hash_rules
from app.ioc.rules.malware_rules import actions_for_family
from app.ioc.rules.ransomware_rules import actions_for_group

_VERDICT_TO_PRIORITY = {
    "strong_malicious_indicators": "high",
    "moderate_risk_indicators": "medium",
    "low_risk_indicators": "low",
    "no_significant_indicators": "none",
}

_TYPE_MODULES = {
    "ipv4": ip_rules,
    "domain": domain_rules,
    "url": url_rules,
    "md5": hash_rules,
    "sha1": hash_rules,
    "sha256": hash_rules,
}


def _dedupe(items):
    seen = set()
    out = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


def priority_for_verdict(verdict: str) -> str:
    return _VERDICT_TO_PRIORITY.get(verdict, "low")


def generate_recommendations(indicator_type: str, verdict: str, sources: dict, correlation: dict) -> dict:
    """Build {"priority": ..., "actions": [...]} for the given lookup result."""
    priority = _VERDICT_TO_PRIORITY.get(verdict, "low")
    type_module = _TYPE_MODULES.get(indicator_type, ip_rules)

    actions = list(type_module.actions_for(priority))

    # Layer 2 + 3 only apply once there's an actual finding to act on - a
    # benign result should stay short ("no action required"), not get
    # padded out with hypothetical family/group guidance.
    if priority != "none":
        vt = sources.get("virustotal", {})
        family = vt.get("malware_family")
        if family:
            actions += actions_for_family(family)

        for group in correlation.get("ransomware_groups", []):
            actions += actions_for_group(group)

    return {"priority": priority, "actions": _dedupe(actions)}
