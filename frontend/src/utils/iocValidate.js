// Client-side mirror of backend/app/ioc/validators.py's identify_ioc().
// Deliberately a loose approximation, not a byte-for-byte port - its only
// job is catching the common case (obviously-not-an-IOC input, or nothing
// typed yet) instantly in the browser, so a lookup attempt doesn't have to
// round-trip to the backend just to be told the input was never valid. The
// backend remains the authoritative validator; this can be slightly more
// permissive on edge cases without causing any real problem, since anything
// it lets through still gets properly checked server-side.

const HASH_LENGTHS = { 32: "md5", 40: "sha1", 64: "sha256" };
const HEX_RE = /^[a-fA-F0-9]+$/;
const DOMAIN_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

const UNSUPPORTED_MESSAGE =
  "That doesn't look like a supported IOC. Try an IPv4 address, a domain, a full URL (http:// or https://), or an MD5/SHA1/SHA256 hash.";

function isIPv4(value) {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function looksLikeIPv6(value) {
  return value.includes(":") && /^[0-9a-fA-F:]+$/.test(value);
}

/**
 * Returns { valid, empty, type, reason }.
 * - empty: nothing (meaningful) typed yet - not an error to surface.
 * - valid: looks like a supported IOC type; safe to submit.
 * - otherwise: valid is false and `reason` has a user-facing explanation.
 */
export function identifyIocClient(raw) {
  const value = (raw || "").trim();
  if (!value) return { valid: false, empty: true };

  if (HEX_RE.test(value) && HASH_LENGTHS[value.length]) {
    return { valid: true, type: HASH_LENGTHS[value.length] };
  }

  if (value.includes("://")) {
    try {
      const url = new URL(value);
      if ((url.protocol === "http:" || url.protocol === "https:") && url.host) {
        return { valid: true, type: "url" };
      }
    } catch {
      // Not a parseable URL - fall through to the other checks below in
      // case it's actually e.g. a domain that happens to contain "://"
      // somewhere odd (rare, but not worth hard-rejecting here).
    }
  }

  if (isIPv4(value)) return { valid: true, type: "ipv4" };

  if (looksLikeIPv6(value)) {
    return {
      valid: false,
      reason: "IPv6 addresses aren't supported yet — try an IPv4 address, domain, URL, or hash.",
    };
  }

  if (DOMAIN_RE.test(value)) return { valid: true, type: "domain" };

  return { valid: false, reason: UNSUPPORTED_MESSAGE };
}
