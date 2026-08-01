import { useShowMore } from "../hooks/useShowMore";
import { useCategoryFilter } from "../hooks/useCategoryFilter";
import ShowMoreControl from "./ShowMoreControl";
import CategoryChips from "./CategoryChips";

export default function AdvisoryList({ items }) {
  const {
    active, setActive, total: allTotal, visibleCategories, hiddenCount, expanded, setExpanded, filtered,
  } = useCategoryFilter(items, (a) => a.source, { unknownLabel: "Other Source", maxVisible: 6 });

  const { visible, shown, total, remaining, hasMore, canCollapse, showMore, showAll, reset } = useShowMore(filtered, 10, 10);

  if (!items?.length) return <div className="empty-state">No advisories yet. Try refreshing.</div>;

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
        canCollapse={canCollapse}
        step={10}
        onShowMore={showMore}
        onShowAll={showAll}
        onReset={reset}
      />
    </div>
  );
}
