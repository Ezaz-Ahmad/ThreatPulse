const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
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
  newsVolume: (days = 30) => get(`/api/analytics/news-volume?days=${days}`),
  severityDistribution: () => get("/api/analytics/severity-distribution"),
  topRansomwareGroups: (limit = 10, days = 90) => get(`/api/analytics/top-ransomware-groups?limit=${limit}&days=${days}`),
  topSectors: (limit = 10, days = 90) => get(`/api/analytics/top-sectors?limit=${limit}&days=${days}`),
  kevTimeline: (days = 90) => get(`/api/analytics/kev-timeline?days=${days}`),
  byCountry: () => get("/api/analytics/by-country"),
};
