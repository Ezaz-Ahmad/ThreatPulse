import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import RadialProgress from "./viz/RadialProgress";
import HelpTip from "./HelpTip";
import { identifyIocClient } from "../utils/iocValidate";

const PROVIDER_LABELS = {
  abuseipdb: "AbuseIPDB",
  virustotal: "VirusTotal",
  otx: "AlienVault OTX",
  urlhaus: "URLhaus",
  threatpulse: "ThreatPulse Database",
};

const TYPE_LABELS = {
  ipv4: "IPv4 Address",
  domain: "Domain",
  url: "URL",
  md5: "MD5 Hash",
  sha1: "SHA1 Hash",
  sha256: "SHA256 Hash",
};

const VERDICT_COLOR = {
  strong_malicious_indicators: "var(--danger)",
  moderate_risk_indicators: "var(--warn)",
  low_risk_indicators: "var(--accent-2)",
  no_significant_indicators: "var(--ok)",
  security_test_artifact: "var(--info)",
};

const PRIORITY_META = {
  high: { label: "High Priority", cls: "ioc-priority-high" },
  medium: { label: "Medium Priority", cls: "ioc-priority-medium" },
  low: { label: "Low Priority", cls: "ioc-priority-low" },
  none: { label: "No Action Needed", cls: "ioc-priority-none" },
  info: { label: "Security Test — Not Malicious", cls: "ioc-priority-info" },
};

function providerDetail(name, result) {
  if (!result) return null;
  switch (name) {
    case "abuseipdb":
      if (result.status !== "success") return null;
      return `${result.abuse_confidence_score}% confidence · ${result.total_reports} report${result.total_reports === 1 ? "" : "s"}`;
    case "virustotal":
      if (result.status !== "success") return null;
      return `${result.malicious} malicious · ${result.suspicious} suspicious · ${result.harmless} harmless`;
    case "otx":
      if (result.status !== "success") return null;
      return `${result.pulse_count} threat-intelligence pulse${result.pulse_count === 1 ? "" : "s"}`;
    case "urlhaus":
      if (result.status !== "success") return null;
      return `${result.matches} known-malware match${result.matches === 1 ? "" : "es"}`;
    case "threatpulse":
      if (result.status !== "success") return null;
      return `${result.mention_count} mention${result.mention_count === 1 ? "" : "s"} in ingested intelligence`;
    default:
      return null;
  }
}

function statusMeta(status) {
  switch (status) {
    case "success":
      return { label: "Match found", cls: "ioc-status-hit" };
    case "no_match":
      return { label: "No match", cls: "ioc-status-clear" };
    case "not_configured":
      return { label: "Not configured", cls: "ioc-status-muted" };
    case "unsupported_type":
      return { label: "N/A for this type", cls: "ioc-status-muted" };
    case "error":
      return { label: "Lookup failed", cls: "ioc-status-error" };
    default:
      return { label: status || "Unknown", cls: "ioc-status-muted" };
  }
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function IOCLookupPanel() {
  const [indicator, setIndicator] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [recent, setRecent] = useState([]);
  const [touched, setTouched] = useState(false);

  // Instant, browser-side format check — mirrors the backend's own validator
  // so obviously-invalid input never has to make a round trip just to be
  // told "no". The backend still gets the final say on anything this lets
  // through.
  const validation = useMemo(() => identifyIocClient(indicator), [indicator]);
  const showFormatError = touched && !validation.valid && !validation.empty;

  const loadRecent = useCallback(async () => {
    try {
      setRecent(await api.iocRecent());
    } catch {
      // recent-lookups sidebar is a nice-to-have, never block the main tool on it
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const runLookup = useCallback(async (value) => {
    const trimmed = (value ?? indicator).trim();
    if (!trimmed) return;
    const check = identifyIocClient(trimmed);
    if (!check.valid) {
      setTouched(true);
      setError(check.reason || "That doesn't look like a valid indicator.");
      setReport(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.iocLookup(trimmed);
      setReport(result);
      setIndicator(trimmed);
      loadRecent();
    } catch (e) {
      setError(e.message || "Lookup failed. Is the backend running?");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [indicator, loadRecent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    runLookup();
  };

  const sourceEntries = report
    ? Object.entries(report.sources).filter(([name]) => name in PROVIDER_LABELS)
    : [];

  return (
    <div className="ioc-panel">
      <form className="ioc-search" onSubmit={handleSubmit}>
        <input
          className={`ioc-input ${showFormatError ? "ioc-input-invalid" : ""}`}
          placeholder="Paste an IP, domain, URL, or file hash…"
          aria-label="Indicator to look up (IP address, domain, URL, or file hash)"
          aria-invalid={showFormatError}
          value={indicator}
          onChange={(e) => {
            setIndicator(e.target.value);
            if (error) setError(null);
          }}
          onBlur={() => setTouched(true)}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          className="ioc-submit"
          disabled={loading || !indicator.trim() || (touched && !validation.valid)}
        >
          {loading ? "Looking up…" : "Look up"}
        </button>
      </form>

      {showFormatError && !error && (
        <div className="error-state ioc-format-error">{validation.reason}</div>
      )}

      {error && <div className="error-state">{error}</div>}

      {loading && (
        <div className="loading-inline">
          <span className="spinner" aria-hidden="true" />
          <span>Querying providers concurrently…</span>
        </div>
      )}

      {!loading && !report && !error && (
        <div className="ioc-empty">
          <p>
            Enter a suspicious indicator above — an IPv4 address, domain, URL,
            or MD5/SHA1/SHA256 file hash — to get a consolidated risk report.
          </p>
          {recent.length > 0 && (
            <div className="ioc-recent">
              <div className="ioc-recent-title">Recent lookups</div>
              <div className="ioc-recent-list">
                {recent.map((r) => (
                  <button
                    key={r.indicator}
                    className="ioc-recent-chip"
                    onClick={() => { setIndicator(r.indicator); runLookup(r.indicator); }}
                  >
                    <span className="ioc-recent-indicator">{r.indicator}</span>
                    {r.risk_score !== null && (
                      <span className="ioc-recent-score" style={{ color: VERDICT_COLOR[r.verdict] || "var(--muted)" }}>
                        {r.risk_score}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && report && (
        <div className="ioc-report">
          <div className="ioc-report-header">
            <div>
              <div className="ioc-indicator-row">
                <code className="ioc-indicator-value">{report.indicator}</code>
                <span className="ioc-type-badge">{TYPE_LABELS[report.indicator_type] || report.indicator_type}</span>
                {report.cached && <span className="ioc-cached-badge" title="Served from cache — a recent lookup for this indicator already exists">Cached</span>}
              </div>
              <div className="ioc-fetched-at">Last checked {formatDate(report.fetched_at)}</div>
            </div>
          </div>

          <div className="ioc-score-row">
            {report.verdict === "security_test_artifact" ? (
              <RadialProgress
                pct={report.risk_score}
                color={VERDICT_COLOR[report.verdict] || "var(--accent)"}
                size={76}
                centerText="N/A"
                ariaLabel="Not applicable — known test artifact, not a risk score"
              />
            ) : (
              <RadialProgress pct={report.risk_score} color={VERDICT_COLOR[report.verdict] || "var(--accent)"} size={76} />
            )}
            <div className="ioc-score-details">
              <div className="ioc-verdict" style={{ color: VERDICT_COLOR[report.verdict] || "var(--text)" }}>
                {report.verdict_label}
                <HelpTip title={report.verdict === "security_test_artifact" ? "Why this shows N/A" : "ThreatPulse risk score"}>
                  {report.verdict === "security_test_artifact" ? (
                    <>
                      A percentage here would look like a risk score, but it isn't
                      one — every AV/EDR engine is designed to flag this file on
                      purpose. The raw provider detection rate ({report.risk_score}%)
                      is still shown in the score breakdown below for transparency,
                      it's just not meaningful as a "how malicious is this" number.
                    </>
                  ) : (
                    <>
                      This is a ThreatPulse prioritisation score built from provider
                      reputation data and internal correlation — not proof the
                      indicator is malicious. Always validate against internal
                      evidence before acting on it.
                    </>
                  )}
                </HelpTip>
              </div>
              <div className="ioc-confidence">Confidence: <strong>{report.confidence}</strong></div>
            </div>
          </div>

          {report.score_reasons.length > 0 && (
            <div className="ioc-section">
              <div className="ioc-section-title">Score breakdown</div>
              <ul className="ioc-reason-list">
                {report.score_reasons.map((r, i) => {
                  const isOverride = r.source === "Classification override";
                  return (
                    <li key={i} className={isOverride ? "ioc-reason-override" : ""}>
                      <span className="ioc-reason-points">{r.points > 0 ? `+${r.points}` : "▲"}</span>
                      <span className="ioc-reason-source">{r.source}</span>
                      <span className="ioc-reason-text">{r.reason}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="ioc-section">
            <div className="ioc-section-title">Provider results</div>
            <div className="ioc-provider-grid">
              {sourceEntries.map(([name, result]) => {
                const meta = statusMeta(result.status);
                const detail = providerDetail(name, result);
                return (
                  <div key={name} className="ioc-provider-card">
                    <div className="ioc-provider-name">{PROVIDER_LABELS[name]}</div>
                    <span className={`ioc-status-pill ${meta.cls}`}>{meta.label}</span>
                    {detail && <div className="ioc-provider-detail">{detail}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {report.correlation?.mentions?.length > 0 && (
            <div className="ioc-section">
              <div className="ioc-section-title">Related ThreatPulse intelligence</div>
              <ul className="ioc-correlation-list">
                {report.correlation.mentions.map((m, i) => (
                  <li key={i}>
                    <span className="ioc-correlation-type">{m.type}</span>
                    {m.link ? (
                      <a href={m.link} target="_blank" rel="noreferrer">{m.title}</a>
                    ) : (
                      <span>{m.title}</span>
                    )}
                    {m.published_at && <span className="ioc-correlation-date">{formatDate(m.published_at)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="ioc-section">
            <div className="ioc-guidance-header">
              <div className="ioc-section-title">Recommended analyst actions</div>
              {report.analyst_guidance?.priority && (
                <span className={`ioc-priority-badge ${PRIORITY_META[report.analyst_guidance.priority]?.cls || ""}`}>
                  {PRIORITY_META[report.analyst_guidance.priority]?.label || report.analyst_guidance.priority}
                </span>
              )}
            </div>
            <ul className={`ioc-guidance-list ${report.analyst_guidance?.priority === "none" ? "ioc-guidance-list-short" : ""}`}>
              {(report.analyst_guidance?.actions || []).map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>

          <p className="ioc-disclaimer">
            This score does not replace analyst judgment. Validate against
            internal firewall, proxy, DNS, and EDR evidence before taking
            action — external reputation data can contain false positives or
            outdated information.
          </p>
        </div>
      )}
    </div>
  );
}
