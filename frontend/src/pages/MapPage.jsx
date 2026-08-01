import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import { api } from "../api";
import ThreatMap, { regionName } from "../components/ThreatMap";
import CountryDirectory from "../components/CountryDirectory";
import ScrollButtons from "../components/ScrollButtons";
import CreatorCredit from "../components/CreatorCredit";
import { GENERAL_MITIGATIONS } from "../data/mitigationGuidance";

// ransomware.live sometimes reports the sector as the literal string
// "Not Found" instead of leaving it blank — treat that the same as missing.
function sectorLabel(s) {
  if (!s || s === "Not Found") return null;
  return s;
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(iso) {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

// Mirrors KEVTable's due-date badge so the two pages read consistently.
function DueBadge({ dueDate }) {
  if (!dueDate) return <span className="due-plain">-</span>;
  const days = daysUntil(dueDate);
  const dateLabel = formatDate(dueDate);
  if (days < 0) return <span className="badge critical">Overdue · {dateLabel}</span>;
  if (days <= 7) return <span className="badge high">Due soon · {dateLabel}</span>;
  return <span className="due-plain">Patch by {dateLabel}</span>;
}

export default function MapPage() {
  const [countries, setCountries] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [victims, setVictims] = useState(null);
  const [victimsLoading, setVictimsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [advisories, setAdvisories] = useState(null);
  const [patchNow, setPatchNow] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    api.byCountry().then(setCountries).catch(() => setError("Could not load map data. Is the backend running?"));
    api.stats().then(setStats).catch(() => {});
    // Real, live source for mitigation content: CISA's own advisory feed
    // (the same one that already powers the CISA Advisories tab) includes
    // its #StopRansomware joint bulletins, which do carry group-specific
    // mitigation detail. Filtering that feed for ransomware-related titles
    // means this list updates itself the moment the next scheduled ingest
    // picks up a new advisory — no separate pipeline needed, and we link to
    // CISA's own page rather than scraping/reproducing their write-up.
    api.advisories("?search=ransomware&limit=6").then(setAdvisories).catch(() => setAdvisories([]));
    // The most concrete, current "what to actually do" data we have: CISA's
    // Known Exploited Vulnerabilities catalog, filtered to entries flagged
    // as actively used by ransomware, sorted newest-first. Each one carries
    // a real CISA-mandated remediation deadline — this is genuinely
    // up-to-date since the KEV catalog itself is updated by CISA far more
    // often than their advisory RSS feed, and our backend re-ingests it on
    // every scheduled refresh.
    api.kev("?ransomware_only=true&limit=6").then(setPatchNow).catch(() => setPatchNow([]));
  }, []);

  useEffect(() => {
    if (!selected) {
      setVictims(null);
      return;
    }
    setVictimsLoading(true);
    api
      .ransomware(`?country=${selected}&limit=20`)
      .then(setVictims)
      .catch(() => setVictims([]))
      .finally(() => setVictimsLoading(false));
  }, [selected]);

  const totals = useMemo(() => {
    if (!countries) return null;
    return {
      incidents: countries.reduce((sum, c) => sum + c.count, 0),
      countries: countries.length,
    };
  }, [countries]);

  // Selecting a country from the full directory can land on one with zero
  // recorded incidents (it isn't in `countries`, which only holds countries
  // that DO have activity). Fall back to a synthetic zero-entry rather than
  // null so the sidebar still confirms *which* country is selected instead
  // of silently reverting to the generic "explore the map" placeholder.
  const selectedEntry = useMemo(() => {
    if (!selected) return null;
    const found = countries?.find((c) => c.country === selected);
    return found || { country: selected, count: 0, top_group: null, top_sector: null };
  }, [selected, countries]);

  const topCountries = useMemo(() => (countries || []).slice(0, 8), [countries]);

  return (
    <>
      <div className="grid-backdrop" />
      <div className="about-page map-page">
        <div className="about-page-nav">
          <Link to="/" className="back-link">
            <span className="arrow-left">←</span> Back to ThreatPulse
          </Link>
        </div>

        <section className="about about-standalone in-view map-page-section">
          <div className="about-intro">
            <div className="hero-eyebrow">
              <span className="pulse-dot" />
              Live Threat Intelligence
            </div>
            <h1 className="about-title">Global Ransomware Activity</h1>
            <p className="about-lede">
              Every ransomware victim ThreatPulse tracks is geotagged by country as it's published to
              leak sites. This map plots that activity live, so you can see where attacks are
              concentrated right now instead of piecing it together from headlines.
            </p>
            {totals && (
              <div className="map-summary-stats">
                <span><strong>{totals.incidents}</strong> incidents tracked</span>
                <span><strong>{totals.countries}</strong> countries affected</span>
                {stats?.last_ingest_at && (
                  <span>Data updated {new Date(stats.last_ingest_at).toLocaleString()}</span>
                )}
              </div>
            )}
          </div>

          {error && <div className="error-state">{error}</div>}

          {!error && (
            <div className="map-layout">
              <div className="map-main">
                <ThreatMap data={countries || []} selected={selected} onSelectCountry={setSelected} />
                <p className="map-hint">
                  Scroll or use the +/– buttons to zoom, drag to pan, click a country for details.
                  Countries with no recorded incidents stay dark.
                </p>

                <div className="map-top-list">
                  <h2 className="about-section-title">Most-Affected Countries</h2>
                  <div className="map-top-grid">
                    {topCountries.map((c) => (
                      <button
                        type="button"
                        key={c.country}
                        className={`map-top-item ${selected === c.country ? "active" : ""}`}
                        onClick={() => setSelected(c.country === selected ? null : c.country)}
                      >
                        <span className="map-top-name">{regionName(c.country) || c.country}</span>
                        <span className="map-top-count">{c.count}</span>
                      </button>
                    ))}
                    {countries && countries.length === 0 && (
                      <div className="empty-state">No geotagged incidents yet. Try refreshing the dashboard.</div>
                    )}
                  </div>
                </div>

                <CountryDirectory data={countries || []} selected={selected} onSelectCountry={setSelected} />
              </div>

              <aside className="map-sidebar">
                {selectedEntry ? (
                  <div className="map-detail-card">
                    <div className="map-detail-head">
                      <h3>{regionName(selectedEntry.country) || selectedEntry.country}</h3>
                      <button
                        type="button"
                        className="map-detail-close"
                        onClick={() => setSelected(null)}
                        aria-label="Clear selection"
                        title="Clear selection"
                      >
                        ×
                      </button>
                    </div>
                    <div className="map-detail-stats">
                      <div className="map-detail-stat">
                        <span className={`map-detail-num ${selectedEntry.count === 0 ? "is-zero" : ""}`}>
                          {selectedEntry.count}
                        </span>
                        <span>Incidents</span>
                      </div>
                      {selectedEntry.top_group && (
                        <div className="map-detail-stat">
                          <span className="map-detail-num-small">{selectedEntry.top_group}</span>
                          <span>Most active group</span>
                        </div>
                      )}
                      {sectorLabel(selectedEntry.top_sector) && (
                        <div className="map-detail-stat">
                          <span className="map-detail-num-small">{sectorLabel(selectedEntry.top_sector)}</span>
                          <span>Top sector</span>
                        </div>
                      )}
                    </div>

                    <h4 className="map-detail-subhead">Recent incidents</h4>
                    {victimsLoading && <div className="loading-inline">Loading…</div>}
                    <div className="map-victim-list">
                      {victims?.map((v) => (
                        <div className="map-victim-item" key={v.id}>
                          {v.link ? (
                            <a href={v.link} target="_blank" rel="noreferrer" className="map-victim-name">
                              {v.victim_name}
                            </a>
                          ) : (
                            <span className="map-victim-name">{v.victim_name}</span>
                          )}
                          <div className="map-victim-meta">
                            <span className="badge ransomware">{v.group_name}</span>
                            {sectorLabel(v.sector) && <span>{sectorLabel(v.sector)}</span>}
                            {v.published_at && <span>{formatDate(v.published_at)}</span>}
                          </div>
                        </div>
                      ))}
                      {!victimsLoading && victims && victims.length === 0 && (
                        <div className="empty-state">No incident details available.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="map-detail-card map-detail-empty">
                    <h3>Explore the map</h3>
                    <p>
                      Click a country — on the map or in the list on the left — to see its recent
                      ransomware incidents, most active group, and top targeted sector.
                    </p>
                  </div>
                )}

                <div className="map-advisories-card">
                  <h4>
                    Vulnerabilities To Patch Now
                    <span className="map-live-tag"><span className="pulse-dot" />Live</span>
                  </h4>
                  <p className="map-guidance-note">
                    The most concrete answer to "what should we actually do": CISA's Known Exploited
                    Vulnerabilities catalog, filtered to flaws confirmed to be actively used by
                    ransomware, each with CISA's own remediation deadline. Updates automatically as
                    CISA adds new entries.
                  </p>
                  {patchNow === null && <div className="loading-inline">Loading…</div>}
                  {patchNow && patchNow.length === 0 && (
                    <div className="empty-state">No ransomware-linked KEV entries right now.</div>
                  )}
                  {patchNow && patchNow.length > 0 && (
                    <ul className="map-advisory-list">
                      {patchNow.map((k) => (
                        <li key={k.id}>
                          <a
                            href={`https://nvd.nist.gov/vuln/detail/${k.cve_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="map-advisory-title"
                          >
                            {k.cve_id} — {k.vendor_project}{k.product ? ` ${k.product.trim()}` : ""}
                          </a>
                          <div className="map-victim-meta">
                            <DueBadge dueDate={k.due_date} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="map-advisories-card">
                  <h4>
                    Latest Official Advisories
                    <span className="map-live-tag"><span className="pulse-dot" />Live</span>
                  </h4>
                  <p className="map-guidance-note">
                    Pulled from CISA's own advisory feed (the same one behind the CISA Advisories tab),
                    filtered to ransomware bulletins. New entries appear here automatically as CISA
                    publishes them — no fixed schedule on our end, it's tied to their feed.
                  </p>
                  {advisories === null && <div className="loading-inline">Loading…</div>}
                  {advisories && advisories.length === 0 && (
                    <div className="empty-state">No ransomware-specific CISA advisories in the current feed right now.</div>
                  )}
                  {advisories && advisories.length > 0 && (
                    <ul className="map-advisory-list">
                      {advisories.map((a) => (
                        <li key={a.id}>
                          <a href={a.link} target="_blank" rel="noreferrer" className="map-advisory-title">
                            {a.title}
                          </a>
                          <span className="map-advisory-meta">
                            CISA{a.published_at ? ` · ${formatDate(a.published_at)}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="map-guidance-card">
                  <h4>
                    Baseline Mitigation Guidance
                    <span className="map-guidance-tag">Evergreen, not incident-specific</span>
                  </h4>
                  <p className="map-guidance-note">
                    {selectedEntry?.top_group
                      ? `No dataset records what any country actually did in response to an attack. These are standard, publicly-published fundamentals that apply regardless of which group is active — including ${selectedEntry.top_group}:`
                      : "No dataset records what any country actually did in response to an attack. These are standard, publicly-published fundamentals that apply to ransomware in general:"}
                  </p>
                  <ul className="map-guidance-list">
                    {GENERAL_MITIGATIONS.map((m) => (
                      <li key={m.title}>
                        <strong>{m.title}.</strong> {m.body}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          )}
        </section>

        <div className="footer-note about-page-footer">
          <div>
            Country-level activity is sourced from ransomware.live's leak-site tracker. ThreatPulse is
            an independent project and is not affiliated with CISA, NVD, or any of the sources it
            aggregates.
          </div>
          <CreatorCredit variant="footer" />
        </div>
      </div>
      <ScrollButtons />
    </>
  );
}
