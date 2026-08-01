export default function AdvisoryList({ items }) {
  if (!items?.length) return <div className="empty-state">No advisories yet. Try refreshing.</div>;
  return (
    <div className="card-list">
      {items.map((a) => (
        <div className="item-card" key={a.id}>
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
