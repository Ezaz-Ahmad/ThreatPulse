import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import "../App.css";
import { api } from "../api";
import StatCards from "../components/StatCards";
import NewsList from "../components/NewsList";
import AdvisoryList from "../components/AdvisoryList";
import CVETable from "../components/CVETable";
import KEVTable from "../components/KEVTable";
import RansomwareTable from "../components/RansomwareTable";
import Hero from "../components/Hero";
import SkeletonLoader from "../components/SkeletonLoader";
import LiveClock from "../components/LiveClock";
import CreatorCredit from "../components/CreatorCredit";
import ScrollButtons from "../components/ScrollButtons";
import TermHints from "../components/TermHints";
const AnalyticsPanel = lazy(() => import("../components/AnalyticsPanel"));

const TABS = [
  { key: "news", label: "News Feed" },
  { key: "advisories", label: "CISA Advisories" },
  { key: "cves", label: "Recent CVEs" },
  { key: "kev", label: "KEV Catalog" },
  { key: "ransomware", label: "Ransomware Tracker" },
  { key: "analytics", label: "Analytics" },
];

const TAB_DESCRIPTIONS = {
  news: "Latest cybersecurity headlines, aggregated from six trusted outlets in real time.",
  advisories: "Official vulnerability advisories published by CISA, the U.S. Cybersecurity and Infrastructure Security Agency.",
  cves: "Newly published or updated vulnerabilities from the National Vulnerability Database, sorted by severity so the most urgent issues stand out first.",
  kev: "CISA's Known Exploited Vulnerabilities catalog — flaws confirmed to be under active attack, which is what makes them the highest priority to patch.",
  ransomware: "Recent victim postings pulled from ransomware group leak sites, tracked via ransomware.live.",
};

// Which glossary terms to surface as hint chips under each tab's
// description — only for tabs that actually use jargon a non-expert
// wouldn't know. Keys match entries in src/data/glossary.js.
const TAB_TERMS = {
  advisories: ["cisa"],
  cves: ["cve", "cvss", "severity", "nvd"],
  kev: ["kev", "cisa", "dueDate"],
  ransomware: ["ransomware"],
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 30; // ~2.5 minutes of polling before giving up

export default function Home() {
  const [tab, setTab] = useState("news");
  const [stats, setStats] = useState(null);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState("");
  // Transient "just finished" state so the button gives positive feedback
  // (checkmark + green flash) instead of snapping straight from spinning
  // back to idle, which read as if the click had done nothing.
  const [justRefreshed, setJustRefreshed] = useState(false);
  const justRefreshedTimer = useRef(null);
  const pollTimer = useRef(null);
  const tabsRef = useRef(null);
  // Tracks whether the swipeable mobile tab strip has more tabs hidden off
  // to the left/right, so we can show a fade + arrow hint. Without this,
  // "Recent CVEs" looked like the last tab on a phone even though KEV
  // Catalog, Ransomware Tracker, and Analytics were just off-screen.
  const [tabsOverflow, setTabsOverflow] = useState({ left: false, right: false });

  const loadStats = useCallback(async () => {
    try {
      const fresh = await api.stats();
      setStats(fresh);
      return fresh;
    } catch (e) {
      // stats failure shouldn't block the rest of the UI
      console.error(e);
      return null;
    }
  }, []);

  const loadTabData = useCallback(async (currentTab, currentSearch) => {
    if (currentTab === "analytics") return; // AnalyticsPanel fetches its own data
    setLoading(true);
    setError(null);
    try {
      const params = currentSearch ? `?search=${encodeURIComponent(currentSearch)}&limit=100` : "?limit=100";
      let result;
      if (currentTab === "news") result = await api.news(params);
      else if (currentTab === "advisories") result = await api.advisories(params);
      else if (currentTab === "cves") result = await api.cves(params);
      else if (currentTab === "kev") result = await api.kev(currentSearch ? `?search=${encodeURIComponent(currentSearch)}&limit=100` : "?limit=100");
      else if (currentTab === "ransomware") result = await api.ransomware("?limit=100");
      setData(result);
    } catch (e) {
      setError("Could not reach the API. Is the backend running on the configured VITE_API_BASE?");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTabData(tab, search);
  }, [tab, search, loadTabData]);

  // Keep the dashboard from going stale if someone leaves the tab open all day.
  useEffect(() => {
    const id = setInterval(() => {
      window.location.reload();
    }, ONE_DAY_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => clearTimeout(pollTimer.current), []);
  useEffect(() => () => clearTimeout(justRefreshedTimer.current), []);

  const updateTabsOverflow = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setTabsOverflow({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < maxScroll - 4,
    });
  }, []);

  // Re-check after the tab list first paints, and again if the viewport
  // (or device rotation) changes whether the strip overflows at all.
  useEffect(() => {
    updateTabsOverflow();
    window.addEventListener("resize", updateTabsOverflow);
    return () => window.removeEventListener("resize", updateTabsOverflow);
  }, [updateTabsOverflow]);

  const handleStatSelect = (key) => {
    setTab(key);
    setSearch("");
    requestAnimationFrame(() => {
      document.getElementById("data-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshNote("Refresh started — this can take up to a minute…");
    const previousTimestamp = stats?.last_ingest_at ?? null;

    try {
      await api.refresh(); // returns almost instantly; ingestion runs in the background

      let attempts = 0;
      let updated = false;
      while (attempts < MAX_POLL_ATTEMPTS) {
        await new Promise((resolve) => {
          pollTimer.current = setTimeout(resolve, POLL_INTERVAL_MS);
        });
        const fresh = await loadStats();
        attempts += 1;
        if (fresh?.last_ingest_at && fresh.last_ingest_at !== previousTimestamp) {
          updated = true;
          break;
        }
      }

      await loadTabData(tab, search);
      setRefreshNote(updated ? "" : "Still finishing up in the background — check back in a bit.");
      if (updated) {
        setJustRefreshed(true);
        justRefreshedTimer.current = setTimeout(() => setJustRefreshed(false), 1400);
      }
    } catch (e) {
      setError("Refresh failed. Check the backend logs.");
      setRefreshNote("");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <div className="grid-backdrop" />
      <Hero />
      <div className="app" id="dashboard">
      <div className="app-header">
        <h1>Threat<span>Pulse</span></h1>
        <div className="header-meta">
          <LiveClock />
          {stats?.last_ingest_at && (
            <span className="last-updated">Data updated: {new Date(stats.last_ingest_at).toLocaleString()}</span>
          )}
          <button
            className={`refresh-btn ${refreshing ? "is-refreshing" : ""} ${justRefreshed ? "is-done" : ""}`}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <svg
              className="refresh-btn-icon"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {justRefreshed ? (
                <polyline points="4 12 9 17 20 6" />
              ) : (
                <path d="M20 11.5A8 8 0 1 0 17.6 17M20 5v6.5h-6.5" />
              )}
            </svg>
            <span>{refreshing ? "Refreshing…" : justRefreshed ? "Updated" : "Refresh Now"}</span>
          </button>
        </div>
      </div>

      {refreshNote && <div className="refresh-note">{refreshNote}</div>}

      <StatCards stats={stats} onSelectTab={handleStatSelect} />

      <div className="tabs-wrap" id="data-tabs">
        <div className="tabs" ref={tabsRef} onScroll={updateTabsOverflow}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? "active" : ""}`}
              onClick={() => { setTab(t.key); setSearch(""); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={`tabs-fade tabs-fade-left ${tabsOverflow.left ? "" : "is-hidden"}`} aria-hidden="true" />
        <div className={`tabs-fade tabs-fade-right ${tabsOverflow.right ? "" : "is-hidden"}`} aria-hidden="true">
          <span className="tabs-fade-arrow">&rsaquo;</span>
        </div>
      </div>

      {tab !== "analytics" && TAB_DESCRIPTIONS[tab] && (
        <p className="tab-description">{TAB_DESCRIPTIONS[tab]}</p>
      )}
      {tab !== "analytics" && <TermHints terms={TAB_TERMS[tab]} />}

      {tab !== "ransomware" && tab !== "analytics" && (
        <div className="toolbar">
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {tab !== "analytics" && loading && (
        <div className="loading">
          <SkeletonLoader rows={tab === "kev" || tab === "cves" || tab === "ransomware" ? 6 : 4} />
        </div>
      )}
      {tab !== "analytics" && error && <div className="error-state">{error}</div>}

      {!loading && !error && tab === "news" && <NewsList items={data} />}
      {!loading && !error && tab === "advisories" && <AdvisoryList items={data} />}
      {!loading && !error && tab === "cves" && <CVETable items={data} />}
      {!loading && !error && tab === "kev" && <KEVTable items={data} />}
      {!loading && !error && tab === "ransomware" && <RansomwareTable items={data} />}
      {tab === "analytics" && (
        <Suspense fallback={<div className="loading">Loading charts…</div>}>
          <AnalyticsPanel />
        </Suspense>
      )}

      <div className="footer-note">
        <div>
          Sources: The Hacker News, BleepingComputer, Krebs on Security, Dark Reading, SecurityWeek, The Record ·
          CISA Advisories &amp; Known Exploited Vulnerabilities Catalog · NVD CVE feed · ransomware.live leak-site tracker.
          Data auto-refreshes on a schedule set by the backend (default every 6 hours), and this page reloads itself
          once every 24 hours to stay current if left open.
        </div>
        <CreatorCredit variant="footer" />
      </div>
      </div>
      <ScrollButtons />
    </>
  );
}
