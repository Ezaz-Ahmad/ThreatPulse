import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area,
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
const ACCENT = "#35d0ba";
const GRID_COLOR = "#1c2731";
const TEXT_COLOR = "#7c8b9a";
const TOOLTIP_STYLE = {
  background: "#0e151c",
  border: "1px solid #2a3a47",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
};
const TOOLTIP_LABEL_STYLE = { color: "#d7e1ea", marginBottom: 4, fontWeight: 600 };
const NBSP = String.fromCharCode(160);
const ELLIPSIS = String.fromCharCode(8230);

function ChartCard({ title, accent, children, empty, index = 0 }) {
  return (
    <div className="chart-card" style={{ "--card-accent": accent, animationDelay: `${index * 0.08}s` }}>
      <div className="chart-title">
        <span className="chart-title-dot" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
        {title}
      </div>
      {empty ? <div className="empty-state">Not enough data yet.</div> : children}
    </div>
  );
}

function formatShortDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function truncateLabel(str, max = 15) {
  if (!str) return str;
  return str.length > max ? `${str.slice(0, max - 1)}${ELLIPSIS}` : str;
}

// Recharts calls tickFormatter(value, index) - wrap truncateLabel so the
// axis row index never shadows the `max` default parameter (that bug made
// every row truncate to a different, ever-shrinking length). Also swap
// spaces for non-breaking spaces: Recharts' built-in category tick
// auto-wraps onto a second line at any space once the axis lane gets
// tight, which was stacking multi-word labels ("Retail & E-Commerce")
// into their neighboring rows.
function axisTickFormatter(value) {
  return truncateLabel(value).split(" ").join(NBSP);
}

// Renders the count inside each pie slice, but only when the slice is big
// enough to hold it legibly — tiny slices skip the label rather than
// crowding into their neighbors (the legend + tooltip still cover them).
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.62;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
      fontFamily="var(--font-mono)"
      fill="#0b0f14"
    >
      {value}
    </text>
  );
}

function barChartHeight(rows) {
  return Math.max(220, (rows?.length || 0) * 34);
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
      <ChartCard title="News volume (last 30 days)" accent={ACCENT} index={0} empty={newsVolume && newsVolume.every((d) => d.count === 0)}>
        {newsVolume && (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={newsVolume} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="newsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.38} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} stroke={TEXT_COLOR} fontSize={11} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
              <YAxis allowDecimals={false} stroke={TEXT_COLOR} fontSize={11} tickLine={false} axisLine={false} width={34} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ stroke: ACCENT, strokeOpacity: 0.25 }} />
              <Area type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2.5} fill="url(#newsGradient)" activeDot={{ r: 5, fill: ACCENT, stroke: "#0b0f14", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="CVE severity distribution" accent="#ffb454" index={1} empty={severity && severity.length === 0}>
        {severity && (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={severity}
                dataKey="count"
                nameKey="severity"
                innerRadius={44}
                outerRadius={82}
                paddingAngle={2}
                label={renderPieLabel}
                labelLine={false}
                isAnimationActive
              >
                {severity.map((entry) => (
                  <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] || "#8593a3"} stroke="#0b0f14" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: TEXT_COLOR, fontFamily: "var(--font-mono)", paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Top ransomware groups (last 90 days)" accent="#ff5d5d" index={2} empty={topGroups && topGroups.length === 0}>
        {topGroups && (
          <ResponsiveContainer width="100%" height={barChartHeight(topGroups)}>
            <BarChart data={topGroups} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }} barCategoryGap="28%">
              <defs>
                <linearGradient id="ransomGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ff5d5d" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#ff5d5d" stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke={TEXT_COLOR} fontSize={11} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
              <YAxis
                type="category"
                dataKey="group_name"
                width={124}
                stroke={TEXT_COLOR}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                tickFormatter={axisTickFormatter}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: "rgba(255,93,93,0.06)" }} />
              <Bar dataKey="count" fill="url(#ransomGradient)" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Most-targeted sectors (last 90 days)" accent="#4fc3f7" index={3} empty={topSectors && topSectors.length === 0}>
        {topSectors && (
          <ResponsiveContainer width="100%" height={barChartHeight(topSectors)}>
            <BarChart data={topSectors} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }} barCategoryGap="28%">
              <defs>
                <linearGradient id="sectorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#4fc3f7" stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke={TEXT_COLOR} fontSize={11} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
              <YAxis
                type="category"
                dataKey="sector"
                width={124}
                stroke={TEXT_COLOR}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                tickFormatter={axisTickFormatter}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: "rgba(79,195,247,0.06)" }} />
              <Bar dataKey="count" fill="url(#sectorGradient)" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="KEV catalog additions (last 90 days)" accent="#ffb454" index={4} empty={kevTimeline && kevTimeline.every((d) => d.count === 0)}>
        {kevTimeline && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kevTimeline} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="kevGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffb454" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ffb454" stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} stroke={TEXT_COLOR} fontSize={11} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
              <YAxis allowDecimals={false} stroke={TEXT_COLOR} fontSize={11} tickLine={false} axisLine={false} width={34} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: "rgba(255,180,84,0.06)" }} />
              <Bar dataKey="count" fill="url(#kevGradient)" radius={[4, 4, 0, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
