"""Recommended actions for URL indicators, tiered by priority.

Close to domain guidance, but a full URL means there's a specific path/
payload to chase down, not just a host - so web proxy and download checks
lead here instead of DNS.
"""

_HIGH = [
    "Search web proxy/gateway logs for requests to this exact URL.",
    "Check whether any endpoint downloaded a file from this URL.",
    "Review DNS logs for lookups of the URL's host.",
    "Review browser history on potentially affected endpoints.",
    "Check affected endpoints for suspicious processes started after the request.",
]

_MEDIUM = [
    "Search web proxy logs for requests to this URL.",
    "Review DNS logs for lookups of the URL's host.",
]

_LOW = [
    "Note the URL for awareness and re-check proxy logs if it reappears.",
]

_NONE = [
    "No immediate action required.",
    "Continue normal monitoring.",
    "Validate against your internal environment if this URL appears unexpectedly.",
]

_BY_PRIORITY = {"high": _HIGH, "medium": _MEDIUM, "low": _LOW, "none": _NONE}


def actions_for(priority: str) -> list:
    return list(_BY_PRIORITY.get(priority, _LOW))
