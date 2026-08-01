import { useMemo, useState } from "react";

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"];
const SEVERITY_META = {
  CRITICAL: { label: "Critical", color: "var(--danger)" },
  HIGH: { label: "High", color: "var(--warn)" },
  MEDIUM: { label: "Medium", color: "#e8d96a" },
  LOW: { label: "Low", color: "var(--ok)" },
  UNKNOWN: { label: "Unknown", color: "var(--muted)" },
};

function severityKey(sev) {
  return sev ? sev.toUpperCase() : "UNKNOWN";
}

function ScorePill({ score, color }) {
  if (typeof score !== "number") return null;
  const pct = Math.max(0, Math.min(score, 10)) * 10;
  return (
    <span className="score-pill" title={`CVSS score ${score}`}>
      <span className="score-pill-track">
        <span className="score-pill-fill" style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="score-pill-value">{score.toFixed(1)}</span>
    </span>
  );
}

function ExpandableText({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="item-summary">
      <p className={open ? "" : "clamp-3"}>{text}</p>
      {text.length > 180 && (
        <button type="button" className="text-toggle" onClick={() => setOpen((v) => !v)}>
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

export default function CVETable({ items }) {
  const [filter, setFilter] = useState("ALL");

  const counts = useMemo(() => {
    const c = { ALL: items?.length || 0 };
    SEVERITY_ORDER.forEach((s) => { c[s] = 0; });
    items?.forEach((item) => {
      const k = severityKey(item.severity);
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return items;
    if (filter === "ALL") return items;
    return items.filter((item) => severityKey(item.severity) === filter);
  }, [items, filter]);

  if (!items?.length) return <div className="empty-state">No CVEs yet. Try refreshing.</div>;

  return (
    <div>
      <div className="filter-chips">
        <button type="button" className={`chip ${filter === "ALL" ? "active" : ""}`} onClick={() => setFilter("ALL")}>
          All <span className="chip-count">{counts.ALL}</span>
        </button>
        {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <button
            key={s}
            type="button"
            className={`chip ${filter === s ? "active" : ""}`}
            style={{ "--chip-color": SEVERITY_META[s].color }}
            onClick={() => setFilter(s)}
          >
            {SEVERITY_META[s].label} <span className="chip-count">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="card-list">
        {filtered.map((c, i) => {
          const key = severityKey(c.severity);
          const meta = SEVERITY_META[key];
          return (
            <div
              className="item-card"
              key={c.id}
              style={{ animationDelay: `${Math.min(i, 12) * 0.04}s`, "--severity-color": meta.color }}
            >
              <div className="item-card-head">
                <a href={c.source_url} target="_blank" rel="noreferrer" className="mono-title">{c.cve_id}</a>
                <span className={`badge ${key.toLowerCase()}`}>{meta.label}</span>
                <ScorePill score={c.cvss_score} color={meta.color} />
              </div>
              <ExpandableText text={c.description} />
              <div className="item-meta">
                {c.published_at && <span>Published {new Date(c.published_at).toLocaleDateString()}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
