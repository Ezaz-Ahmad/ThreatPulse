"""Detect and normalize the type of an indicator of compromise (IOC).

Supports the four indicator types a SOC analyst most commonly pastes into a
lookup tool: IPv4 addresses, domains, URLs, and file hashes (MD5/SHA1/SHA256).
"""
import ipaddress
import re
from urllib.parse import urlparse

_HASH_LENGTHS = {32: "md5", 40: "sha1", 64: "sha256"}
_HEX_RE = re.compile(r"^[a-fA-F0-9]+$")

# Loose but practical domain matcher: labels of letters/digits/hyphens,
# separated by dots, ending in a plausible TLD. Good enough for triage
# input, not meant to be a strict RFC 1035 validator.
_DOMAIN_RE = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$"
)


class InvalidIOCError(ValueError):
    """Raised when the input doesn't look like any supported IOC type."""


def identify_ioc(raw: str):
    """Return (indicator_type, normalized_value) for a raw user-supplied string.

    Raises InvalidIOCError if the input matches none of the supported types.
    """
    if not raw or not raw.strip():
        raise InvalidIOCError("Enter an IP address, domain, URL, or file hash to look up.")

    value = raw.strip()

    # File hash — pure hex string of a known length.
    if _HEX_RE.match(value) and len(value) in _HASH_LENGTHS:
        return _HASH_LENGTHS[len(value)], value.lower()

    # URL — has a scheme, or looks unambiguously like one (has a path/query
    # after a domain-like host).
    if "://" in value:
        parsed = urlparse(value)
        if parsed.scheme in ("http", "https") and parsed.netloc:
            return "url", value

    # IPv4 address.
    try:
        ipaddress.IPv4Address(value)
        return "ipv4", value
    except ValueError:
        pass

    # Reject IPv6 explicitly with a clear message rather than falling through
    # to "invalid input" — it's a real IOC type, just not one any of the
    # wired-up providers below support yet.
    try:
        ipaddress.IPv6Address(value)
        raise InvalidIOCError("IPv6 addresses aren't supported yet — try an IPv4 address, domain, URL, or hash.")
    except ValueError:
        pass

    # Domain.
    if _DOMAIN_RE.match(value):
        return "domain", value.lower()

    raise InvalidIOCError(
        "That doesn't look like a supported IOC. Try an IPv4 address, a domain, "
        "a full URL (http:// or https://), or an MD5/SHA1/SHA256 hash."
    )
