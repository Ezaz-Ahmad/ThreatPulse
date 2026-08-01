// General ransomware defense practices, paraphrased from widely published
// guidance (CISA's #StopRansomware program and standard industry advice) —
// not tied to any specific incident, group, or country. There is no dataset
// anywhere (including ours) that records what a given country's government
// or organizations actually did in response to a specific attack, so this
// section is deliberately framed as general recommended practice rather
// than a claim about real-world remediation.
export const GENERAL_MITIGATIONS = [
  {
    title: "Offline, tested backups",
    body: "Keep backups that are offline or immutable and regularly test restoring from them, so recovery doesn't depend on paying a ransom.",
  },
  {
    title: "Patch known-exploited vulnerabilities first",
    body: "Prioritize fixes for flaws already listed in CISA's Known Exploited Vulnerabilities catalog — these are the ones attackers are actively using, not just the newest CVEs.",
  },
  {
    title: "Phishing-resistant MFA",
    body: "Require multi-factor authentication on remote-access and privileged accounts, ideally a phishing-resistant method rather than SMS codes.",
  },
  {
    title: "Network segmentation",
    body: "Separate critical systems from the general network so a single compromised device can't reach everything.",
  },
  {
    title: "Lock down remote access",
    body: "Disable or tightly restrict RDP and other remote-management services exposed directly to the internet — a common ransomware entry point.",
  },
  {
    title: "A tested incident response plan",
    body: "Have a written response plan and practice it, so a compromise is a rehearsed process instead of an improvised scramble.",
  },
];
