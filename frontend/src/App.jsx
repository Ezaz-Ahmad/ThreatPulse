import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import "./App.css";
import { api } from "./api";
import StatCards from "./components/StatCards";
import NewsList from "./components/NewsList";
import AdvisoryList from "./components/AdvisoryList";
import CVETable from "./components/CVETable";
import KEVTable from "./components/KEVTable";
import RansomwareTable from "./components/RansomwareTable";
const AnalyticsPanel = lazy(() => import("./components/AnalyticsPanel"));

const TABS = [
  { key: "news", label: "News Feed" },
  { key: "advisories", label: "CISA Advisories" },
  { key: "cves", label: "Recent CVEs" },
  { key: "kev", label: "KEV Catalog" },
  { key: "ransomware", label: "Ransomware Tracker" },
  { key: "analytics", label: "Analytics" },
];

export default function App() {
  const [tab, setTab] = useState("news");
  const [stats, setStats] = useState(null);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.stats());
    } catch (e) {
      // stats failure shouldn't block the rest of the UI
      console.error(e);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.refresh();
      await loadStats();
      await loadTabData(tab, search);
    } catch (e) {
      setError("Refresh failed. Check the backend logs.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>Threat<span>Pulse</span></h1>
        <div className="header-meta">
          {stats?.last_ingest_at && (
            <span>Last updated: {new Date(stats.last_ingest_at).toLocaleString()}</span>
          )}
          <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh Now"}
          </button>
        </div>
      </div>

      <StatCards stats={stats} />

      <div className="tabs">
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

      {tab !== "ransomware" && tab !== "analytics" && (
        <div className="toolbar">
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {tab !== "analytics" && loading && <div className="loading">Loading…</div>}
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
        Sources: The Hacker News, BleepingComputer, Krebs on Security, Dark Reading, SecurityWeek, The Record ·
        CISA Advisories &amp; Known Exploited Vulnerabilities Catalog · NVD CVE feed · ransomware.live leak-site tracker.
        Data auto-refreshes on a schedule set by the backend (default every 6 hours).
      </div>
    </div>
  );
}
