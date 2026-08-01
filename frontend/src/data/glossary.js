// Plain-language explanations for the security jargon used across the
// dashboard. Keyed so the same definition can be reused from stat cards,
// tab headers, and anywhere else a term shows up.
export const GLOSSARY = {
  cisa: {
    term: "CISA",
    definition:
      "The Cybersecurity and Infrastructure Security Agency — the U.S. government body that issues official warnings about dangerous software flaws and coordinates the national response to cyberattacks.",
  },
  cve: {
    term: "CVE",
    definition:
      "Common Vulnerabilities and Exposures — a unique ID (like CVE-2026-12345) given to one specific software security flaw, so researchers, vendors, and defenders can all refer to the exact same bug.",
  },
  cvss: {
    term: "CVSS Score",
    definition:
      "A 0–10 score rating how dangerous a vulnerability is: roughly 0–3.9 Low, 4–6.9 Medium, 7–8.9 High, 9–10 Critical. Higher means easier to exploit and/or more damaging.",
  },
  severity: {
    term: "Severity",
    definition:
      "A simple label (Critical, High, Medium, Low) that summarizes how serious a vulnerability is, based on its CVSS score.",
  },
  kev: {
    term: "KEV",
    definition:
      "Known Exploited Vulnerabilities — CISA's official list of security flaws that attackers are already using in real attacks right now, not just theoretical risks. These get top patching priority.",
  },
  ransomware: {
    term: "Ransomware",
    definition:
      "Malicious software that locks or steals a victim's files, then demands payment to restore or not leak them. Gangs often post victim names on dark-web \"leak sites\" to pressure payment — that's what this tracker monitors.",
  },
  nvd: {
    term: "NVD",
    definition:
      "The National Vulnerability Database — the U.S. government's public catalog of nearly every published CVE, including scores and descriptions.",
  },
  dueDate: {
    term: "Remediation Deadline",
    definition:
      "For KEV entries, CISA sets a deadline by which U.S. federal agencies must patch the flaw. It's a useful urgency signal for anyone running the affected software, not just government systems.",
  },
};
