"""Recommended actions for IPv4 indicators, tiered by priority.

An IP is a network-layer indicator, so the guidance leans on perimeter and
egress telemetry first (firewall/proxy/DNS) before endpoint-level follow-up.
"""

_HIGH = [
    "Review firewall logs for outbound connections to this IP.",
    "Search proxy logs for downloads from this destination.",
    "Check DNS queries for domains that resolved to this IP.",
    "Investigate every internal host communicating with this IP.",
    "Review EDR telemetry on affected endpoints for suspicious activity.",
    "Consider blocking the IP after validating business context and internal evidence.",
]

_MEDIUM = [
    "Search firewall and proxy logs for connections to this IP.",
    "Check DNS queries for domains that resolved to this IP.",
    "Review EDR telemetry on any endpoint found communicating with it.",
]

_LOW = [
    "Note the IP for awareness and re-check if it reappears in logs.",
    "Validate against firewall/proxy logs only if unexpected activity is observed.",
]

_NONE = [
    "No immediate action required.",
    "Continue normal monitoring.",
    "Validate against your internal environment if this IP appears unexpectedly.",
]

_BY_PRIORITY = {"high": _HIGH, "medium": _MEDIUM, "low": _LOW, "none": _NONE}


def actions_for(priority: str) -> list:
    return list(_BY_PRIORITY.get(priority, _LOW))
