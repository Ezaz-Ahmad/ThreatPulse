import { useShowMore } from "../hooks/useShowMore";
import { useCategoryFilter } from "../hooks/useCategoryFilter";
import ShowMoreControl from "./ShowMoreControl";
import CategoryChips from "./CategoryChips";

export default function NewsList({ items }) {
  const {
    active, setActive, total: allTotal, visibleCategories, hiddenCount, expanded, setExpanded, filtered,
  } = useCategoryFilter(items, (n) => n.source, { unknownLabel: "Other Source", maxVisible: 6 });

  const { visible, shown, total, remaining, hasMore, showMore, showAll } = useShowMore(filtered, 10, 10);

  if (!items?.length) return <div className="empty-state">No news items yet. Try refreshing.</div>;

  return (
    <div>
      <CategoryChips
        active={active}
        onSelect={setActive}
        total={allTotal}
        allLabel="All Sources"
        visibleCategories={visibleCategories}
        hiddenCount={hiddenCount}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
      />

      <div className="card-list">
        {visible.map((n, i) => (
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
