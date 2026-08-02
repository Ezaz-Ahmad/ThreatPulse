"""Recommended actions for domain indicators, tiered by priority.

Unlike an IP, a malicious domain is most often reached through DNS
resolution or a phishing email rather than a raw firewall connection - so
DNS and the email gateway lead here instead of firewall logs.
"""

_HIGH = [
    "Review DNS logs for lookups of this domain.",
    "Search the email gateway for messages containing this domain.",
    "Search web proxy logs for requests to this domain.",
    "Review browser history on potentially affected endpoints.",
    "Check whether any endpoint downloaded files from this domain.",
]

_MEDIUM = [
    "Review DNS logs for lookups of this domain.",
    "Search web proxy logs for requests to this domain.",
]

_LOW = [
    "Note the domain for awareness and re-check DNS logs if it reappears.",
]

_NONE = [
    "No immediate action required.",
    "Continue normal monitoring.",
    "Validate against your internal environment if this domain appears unexpectedly.",
]

_BY_PRIORITY = {"high": _HIGH, "medium": _MEDIUM, "low": _LOW, "none": _NONE}


def actions_for(priority: str) -> list:
    return list(_BY_PRIORITY.get(priority, _LOW))
