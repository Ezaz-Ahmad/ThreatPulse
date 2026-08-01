import { useEffect, useState } from "react";
import { api } from "../api";
import { useCountUp } from "../hooks/useCountUp";
import { useInView } from "../hooks/useInView";
import Sparkline from "./viz/Sparkline";
import SeverityBar from "./viz/SeverityBar";
import RadialProgress from "./viz/RadialProgress";
import MiniRankList from "./viz/MiniRankList";
import { NewsIcon, ShieldIcon, BugIcon, AlertTriangleIcon, ZapIcon, TargetIcon } from "./icons";

const TAB_LABEL = {
  news: "News Feed",
  advisories: "Advisories",
  cves: "CVEs",
  kev: "KEV Catalog",
  ransomware: "Ransomware",
};

function AnimatedValue({ value, active }) {
  const isNumber = typeof value === "number" && !Number.isNaN(value);
  const animated = useCountUp(isNumber && active ? value : 0, 900);
  if (!isNumber) return <>{value ?? "-"}</>;
  return <>{animated.toLocaleString()}</>;
}

export default function StatCards({ stats, onSelectTab }) {
  const [ref, inView] = useInView();
  const [viz, setViz] = useState({ newsVolume: [], severity: [], kevTimeline: [], topGroups: [] });

  // Powers the small charts inside each card. These reuse the same
  // analytics endpoints the Analytics tab already calls, so no backend
  // changes were needed — re-fetched whenever a real ingest happens.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.newsVolume(14).catch(() => []),
      api.severityDistribution().catch(() => []),
      api.kevTimeline(14).catch(() => []),
      api.topRansomwareGroups(4, 30).catch(() => []),
    ]).then(([newsVolume, severity, kevTimeline, topGroups]) => {
      if (!cancelled) setViz({ newsVolume, severity, kevTimeline, topGroups });
    });
    return () => {
      cancelled = true;
    };
  }, [stats?.last_ingest_at]);

  if (!stats) return null;

  const kevPct = stats.total_kev ? (stats.kev_ransomware_flagged / stats.total_kev) * 100 : 0;

  const cards = [
    {
      key: "news",
      label: "News Articles",
      value: stats.total_news,
      icon: <NewsIcon />,
      accent: "var(--accent)",
      trend: stats.news_last_7_days ? `+${stats.news_last_7_days} this week` : null,
      inlineViz: viz.newsVolume.length > 1 ? <Sparkline data={viz.newsVolume} color="var(--accent)" /> : null,
    },
    {
      key: "advisories",
      label: "CISA Advisories",
      value: stats.total_advisories,
      icon: <ShieldIcon />,
      accent: "var(--accent-2)",
      footerNote: (
        <span className="stat-live-dot">
          <span className="pulse-dot" /> Official CISA feed
        </span>
      ),
    },
    {
      key: "cves",
      label: "Tracked CVEs",
      value: stats.total_cves,
      icon: <BugIcon />,
      accent: "var(--warn)",
      wideViz: viz.severity.length ? <SeverityBar data={viz.severity} /> : null,
    },
    {
      key: "kev",
      label: "KEV Catalog",
      value: stats.total_kev,
      icon: <AlertTriangleIcon />,
      accent: "#e8d96a",
      trend: "Actively exploited",
      inlineViz: viz.kevTimeline.length > 1 ? <Sparkline data={viz.kevTimeline} color="#e8d96a" /> : null,
    },
    {
      key: "kev",
      label: "Ransomware-Linked KEVs",
      value: stats.kev_ransomware_flagged,
      icon: <ZapIcon />,
      accent: "var(--danger)",
      trend: stats.total_kev ? `${Math.round(kevPct)}% of catalog` : null,
      inlineViz: stats.total_kev ? <RadialProgress pct={kevPct} color="var(--danger)" /> : null,
    },
    {
      key: "ransomware",
      label: "Ransomware Victims",
      value: stats.total_ransomware,
      icon: <TargetIcon />,
      accent: "var(--danger)",
      trend: stats.ransomware_last_7_days ? `+${stats.ransomware_last_7_days} this week` : null,
      wideViz: viz.topGroups.length ? (
        <MiniRankList items={viz.topGroups} labelKey="group_name" countKey="count" color="var(--danger)" />
      ) : null,
    },
  ];

  return (
    <div className={`stats-grid ${inView ? "in-view" : ""}`} ref={ref}>
      {cards.map((c, i) => (
        <button
          type="button"
          className="stat-card stat-card-interactive"
          key={`${c.key}-${c.label}`}
          style={{ animationDelay: `${i * 0.07}s`, "--stat-accent": c.accent }}
          onClick={() => onSelectTab?.(c.key)}
        >
          <div className="stat-card-top">
            <span className="stat-icon">{c.icon}</span>
            {c.inlineViz && <div className="stat-viz">{c.inlineViz}</div>}
          </div>
          <div className="value"><AnimatedValue value={c.value} active={inView} /></div>
          <div className="label">{c.label}</div>
          {c.wideViz && <div className="stat-viz-wide">{c.wideViz}</div>}
          <div className="stat-card-footer">
            <span className="stat-trend">{c.footerNote || c.trend || ""}</span>
            <span className="stat-card-cta">View {TAB_LABEL[c.key]} &rarr;</span>
          </div>
        </button>
      ))}
    </div>
  );
}
