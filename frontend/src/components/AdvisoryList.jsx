import { useShowMore } from "../hooks/useShowMore";
import ShowMoreControl from "./ShowMoreControl";

export default function AdvisoryList({ items }) {
  const { visible, shown, total, remaining, hasMore, showMore, showAll } = useShowMore(items, 10, 10);

  if (!items?.length) return <div className="empty-state">No advisories yet. Try refreshing.</div>;

  return (
    <div>
      <div className="card-list">
        {visible.map((a, i) => (
          <div
            className="item-card"
            key={a.id}
            style={{ animationDelay: `${Math.min(i, 12) * 0.04}s`, "--severity-color": "var(--accent-2)" }}
          >
            <a href={a.link} target="_blank" rel="noreferrer" className="item-title">{a.title}</a>
            <div className="item-meta">
              <span className="badge source">{a.source}</span>
              {a.advisory_id && <span>Advisory #{a.advisory_id}</span>}
              {a.published_at && <span>{new Date(a.published_at).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
      </div>
      <ShowMoreControl
        shown={shown}
        total={total}
        remaining={remaining}
        hasMore={hasMore}
        step={10}
        onShowMore={showMore}
        onShowAll={showAll}
      />
    </div>
  );
}
