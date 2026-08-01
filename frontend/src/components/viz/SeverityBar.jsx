const SEVERITY_COLORS = {
  CRITICAL: "var(--danger)",
  HIGH: "var(--warn)",
  MEDIUM: "#e8d96a",
  LOW: "var(--ok)",
  UNKNOWN: "var(--muted)",
};

export default function SeverityBar({ data }) {
  const segments = (data || []).filter((d) => d.count > 0);
  const total = segments.reduce((sum, d) => sum + d.count, 0);
  if (!total) return null;

  const tooltip = segments.map((d) => `${d.severity}: ${d.count}`).join(" · ");

  return (
    <div className="mini-severity-bar" title={tooltip}>
      {segments.map((d) => (
        <span
          key={d.severity}
          className="mini-severity-seg"
          style={{ width: `${(d.count / total) * 100}%`, background: SEVERITY_COLORS[d.severity] || "var(--muted)" }}
        />
      ))}
    </div>
  );
}
