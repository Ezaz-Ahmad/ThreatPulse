import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { api } from "../api";

const SEVERITY_COLORS = {
  CRITICAL: "#ff5d5d",
  HIGH: "#ffb454",
  MEDIUM: "#e8d96a",
  LOW: "#6ee7b7",
  UNKNOWN: "#8593a3",
};
const BAR_COLOR = "#35d0ba";
const GRID_COLOR = "#232d38";
const TEXT_COLOR = "#8593a3";

function ChartCard({ title, children, empty }) {
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      {empty ? <div className="empty-state">Not enough data yet.</div> : children}
    </div>
  );
}

function formatShortDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function AnalyticsPanel() {
  const [newsVolume, setNewsVolume] = useState(null);
  const [severity, setSeverity] = useState(null);
  const [topGroups, setTopGroups] = useState(null);
  const [topSectors, setTopSectors] = useState(null);
  const [kevTimeline, setKevTimeline] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.newsVolume(30),
      api.severityDistribution(),
      api.topRansomwareGroups(),
      api.topSectors(),
      api.kevTimeline(90),
    ])
      .then(([nv, sev, groups, sectors, kev]) => {
        setNewsVolume(nv);
        setSeverity(sev);
        setTopGroups(groups);
        setTopSectors(sectors);
        setKevTimeline(kev);
      })
      .catch(() => setError("Could not load analytics. Is the backend running?"));
  }, []);

  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="analytics-grid">
      <ChartCard title="News volume (last 30 days)" empty={newsVolume && newsVolume.every((d) => d.count === 0)}>
        {newsVolume && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={newsVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} stroke={TEXT_COLOR} fontSize={11} />
              <YAxis allowDecimals={false} stroke={TEXT_COLOR} fontSize={11} />
              <Tooltip contentStyle={{ background: "#121820", border: "1px solid #232d38" }} />
              <Line type="monotone" dataKey="count" stroke={BAR_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="CVE severity distribution" empty={severity && severity.length === 0}>
        {severity && (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={severity} dataKey="count" nameKey="severity" outerRadius={80} label>
                {severity.map((entry) => (
                  <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] || "#8593a3"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#121820", border: "1px solid #232d38" }} />
              <Legend wrapperStyle={{ fontSize: 12, color: TEXT_COLOR }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Top ransomware groups (last 90 days)" empty={topGroups && topGroups.length === 0}>
        {topGroups && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topGroups} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis type="number" allowDecimals={false} stroke={TEXT_COLOR} fontSize={11} />
              <YAxis type="category" dataKey="group_name" width={100} stroke={TEXT_COLOR} fontSize={11} />
              <Tooltip contentStyle={{ background: "#121820", border: "1px solid #232d38" }} />
              <Bar dataKey="count" fill="#ff5d5d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Most-targeted sectors (last 90 days)" empty={topSectors && topSectors.length === 0}>
        {topSectors && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topSectors} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis type="number" allowDecimals={false} stroke={TEXT_COLOR} fontSize={11} />
              <YAxis type="category" dataKey="sector" width={100} stroke={TEXT_COLOR} fontSize={11} />
              <Tooltip contentStyle={{ background: "#121820", border: "1px solid #232d38" }} />
              <Bar dataKey="count" fill="#9fd3ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="KEV catalog additions (last 90 days)" empty={kevTimeline && kevTimeline.every((d) => d.count === 0)}>
        {kevTimeline && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kevTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} stroke={TEXT_COLOR} fontSize={11} />
              <YAxis allowDecimals={false} stroke={TEXT_COLOR} fontSize={11} />
              <Tooltip contentStyle={{ background: "#121820", border: "1px solid #232d38" }} />
              <Bar dataKey="count" fill="#ffb454" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
