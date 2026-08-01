export default function NewsList({ items }) {
  if (!items?.length) return <div className="empty-state">No news items yet. Try refreshing.</div>;
  return (
    <div className="card-list">
      {items.map((n, i) => (
        <div
          className="item-card"
          key={n.id}
          style={{ animationDelay: `${Math.min(i, 12) * 0.04}s`, "--severity-color": "var(--accent)" }}
        >
          <a href={n.link} target="_blank" rel="noreferrer" className="item-title">{n.title}</a>
          <div className="item-meta">
            <span className="badge source">{n.source}</span>
            {n.published_at && <span>{new Date(n.published_at).toLocaleString()}</span>}
          </div>
          {n.summary && <div className="item-summary"><p>{n.summary}</p></div>}
        </div>
      ))}
    </div>
  );
}
