function regionName(code) {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase());
  } catch {
    return code;
  }
}

export default function RansomwareTable({ items }) {
  if (!items?.length) return <div className="empty-state">No ransomware activity recorded yet. Try refreshing.</div>;
  return (
    <div className="card-list">
      {items.map((r, i) => (
        <div
          className="item-card"
          key={r.id}
          style={{ animationDelay: `${Math.min(i, 12) * 0.04}s`, "--severity-color": "var(--danger)" }}
        >
          <div className="item-card-head">
            {r.link ? (
              <a href={r.link} target="_blank" rel="noreferrer" className="item-title">{r.victim_name}</a>
            ) : (
              <span className="item-title">{r.victim_name}</span>
            )}
            <span className="badge ransomware">{r.group_name}</span>
          </div>
          <div className="item-meta">
            {r.sector && <span className="badge source">{r.sector}</span>}
            {r.country && <span>{regionName(r.country) || r.country}</span>}
            {r.published_at && <span>Posted {new Date(r.published_at).toLocaleDateString()}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
