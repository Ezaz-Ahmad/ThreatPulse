const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Stale-while-revalidate cache for the map + analytics endpoints. Their data
// only changes on the ~6-hourly ingest cycle, but a cold load can take
// several seconds — this makes a *revisit* within the same browser tab
// (switching Map -> Home -> Map, or reloading) paint instantly from cache
// instead of re-running that whole wait. First load in a tab is unchanged:
// there's nothing to serve yet, so it fetches normally.
//
// Deliberately NOT used for news/advisories/cves/kev/ransomware/stats/IOC —
// those back the main list tabs and the manual "Refresh Now" button, where
// showing stale data would be actively misleading rather than a convenience.
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_PREFIX = "tp_cache_v1:";

function readCache(path) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return { data, isStale: Date.now() - ts > CACHE_TTL_MS };
  } catch {
    return null;
  }
}

function writeCache(path, data) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + path, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage can throw (private browsing, quota) - caching is purely
    // an optimization, never something a lookup should fail over on.
  }
}

// Serves a cached response immediately when one exists (even if stale) and
// always keeps a real fetch in flight — transparently on a cold cache, or
// silently in the background when serving stale data, so the cache stays
// warm for the next visit. Pass `onUpdate` to also react once that
// background fetch resolves with fresher data.
function getCached(path, { onUpdate } = {}) {
  const cached = readCache(path);
  if (cached && !cached.isStale) return Promise.resolve(cached.data);

  const fresh = get(path).then((data) => {
    writeCache(path, data);
    return data;
  });

  if (cached && cached.isStale) {
    if (onUpdate) fresh.then(onUpdate).catch(() => {});
    return Promise.resolve(cached.data);
  }
  return fresh;
}

export const api = {
  stats: () => get("/api/stats"),
  news: (params = "") => get(`/api/news${params}`),
  advisories: (params = "") => get(`/api/advisories${params}`),
  cves: (params = "") => get(`/api/cves${params}`),
  kev: (params = "") => get(`/api/kev${params}`),
  ransomware: (params = "") => get(`/api/ransomware${params}`),
  ransomwareCount: (params = "") => get(`/api/ransomware/count${params}`),
  refresh: async () => {
    const res = await fetch(`${API_BASE}/api/refresh`, { method: "POST" });
    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
    return res.json();
  },
  newsVolume: (days = 30, opts) => getCached(`/api/analytics/news-volume?days=${days}`, opts),
  severityDistribution: (opts) => getCached("/api/analytics/severity-distribution", opts),
  topRansomwareGroups: (limit = 10, days = 90, opts) => getCached(`/api/analytics/top-ransomware-groups?limit=${limit}&days=${days}`, opts),
  topSectors: (limit = 10, days = 90, opts) => getCached(`/api/analytics/top-sectors?limit=${limit}&days=${days}`, opts),
  kevTimeline: (days = 90, opts) => getCached(`/api/analytics/kev-timeline?days=${days}`, opts),
  byCountry: (opts) => getCached("/api/analytics/by-country", opts),
  iocLookup: (indicator) => post("/api/ioc/lookup", { indicator }),
  iocRecent: (limit = 8) => get(`/api/ioc/recent?limit=${limit}`),
};
