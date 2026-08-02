"""Ransomware-group-specific recommended actions.

Triggered when an indicator correlates against a group ThreatPulse has
already ingested victim-leak-site postings for (see app/ioc/correlate.py's
`ransomware_groups`). Guidance reflects each group's commonly reported
tradecraft; an unrecognized/newer group still gets sensible generic
ransomware-response guidance rather than nothing.
"""

_GROUP_ACTIONS = [
    ("lockbit", [
        "Review SMB traffic for signs of lateral movement.",
        "Review RDP login attempts and anomalies.",
        "Verify backup integrity and isolate backups from the network.",
        "Check for unusual mass file encryption activity.",
        "Review for Volume Shadow Copy (VSS) deletion commands.",
    ]),
    ("alphv", [
        "Review for use of legitimate remote-management tools for lateral movement.",
        "Verify backup integrity and isolate backups from the network.",
        "Check for signs of data exfiltration prior to encryption (double extortion).",
        "Review for Volume Shadow Copy (VSS) deletion commands.",
    ]),
    ("blackcat", [
        "Review for use of legitimate remote-management tools for lateral movement.",
        "Verify backup integrity and isolate backups from the network.",
        "Check for signs of data exfiltration prior to encryption (double extortion).",
        "Review for Volume Shadow Copy (VSS) deletion commands.",
    ]),
    ("clop", [
        "Check for exploitation of file-transfer or edge appliances (Clop favors these).",
        "Review for signs of mass data exfiltration prior to any encryption.",
        "Verify backup integrity and isolate backups from the network.",
    ]),
    ("cl0p", [
        "Check for exploitation of file-transfer or edge appliances (Clop favors these).",
        "Review for signs of mass data exfiltration prior to any encryption.",
        "Verify backup integrity and isolate backups from the network.",
    ]),
    ("akira", [
        "Review VPN/remote-access logs, especially without MFA (a common Akira entry point).",
        "Verify backup integrity and isolate backups from the network.",
        "Review for Volume Shadow Copy (VSS) deletion commands.",
    ]),
    ("blackbasta", [
        "Review for phishing or QakBot-style loader activity preceding this event.",
        "Verify backup integrity and isolate backups from the network.",
        "Review for Volume Shadow Copy (VSS) deletion commands.",
    ]),
    ("black basta", [
        "Review for phishing or QakBot-style loader activity preceding this event.",
        "Verify backup integrity and isolate backups from the network.",
        "Review for Volume Shadow Copy (VSS) deletion commands.",
    ]),
]

_GENERIC = [
    "Review for lateral movement via SMB/RDP.",
    "Verify backup integrity and isolate backups from the network.",
    "Check for signs of mass file encryption or unusual data exfiltration.",
]


def actions_for_group(group: str) -> list:
    """Return extra actions for a ransomware group name found via correlation."""
    if not group:
        return []
    lowered = group.lower()
    for keyword, actions in _GROUP_ACTIONS:
        if keyword in lowered:
            return [f"Correlated with ransomware group: {group}."] + actions
    return [f"Correlated with ransomware group: {group}."] + _GENERIC
