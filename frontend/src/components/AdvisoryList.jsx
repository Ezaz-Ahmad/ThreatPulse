export default function AdvisoryList({ items }) {
  if (!items?.length) return <div className="empty-state">No advisories yet. Try refreshing.</div>;
  return (
    <div className="card-list">
      {items.map((a, i) => (
        <div className="item-card" key={a.id} style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
          <a href={a.link} target="_blank" rel="noreferrer">{a.title}</a>
          <div className="item-meta">
            <span className="badge source">{a.source}</span>
            {a.advisory_id && <span>{a.advisory_id}</span>}
            {a.published_at && <span>{new Date(a.published_at).toLocaleString()}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
