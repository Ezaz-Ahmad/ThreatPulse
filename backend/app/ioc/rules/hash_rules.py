"""Recommended actions for file hash indicators, tiered by priority.

A hash points at something that already executed (or was staged) on a host,
so the guidance is endpoint-first: EDR sweep, quarantine status, process
tree, persistence, and containment - not network telemetry.
"""

_HIGH = [
    "Search EDR for this file hash across all endpoints.",
    "Check quarantine/detection status in your AV or EDR console.",
    "Identify every host where this hash has been observed.",
    "Review the process tree around the time this file executed.",
    "Review persistence mechanisms (scheduled tasks, run keys, services).",
    "Isolate affected systems pending further investigation.",
]

_MEDIUM = [
    "Search EDR for this file hash across endpoints.",
    "Check quarantine/detection status in your AV or EDR console.",
]

_LOW = [
    "Note the hash for awareness and re-check EDR if it reappears.",
]

_NONE = [
    "No immediate action required.",
    "Continue normal monitoring.",
    "Validate against your internal environment if this hash appears unexpectedly.",
]

_BY_PRIORITY = {"high": _HIGH, "medium": _MEDIUM, "low": _LOW, "none": _NONE}


def actions_for(priority: str) -> list:
    return list(_BY_PRIORITY.get(priority, _LOW))
