import { categoryColor } from "../utils/categoryColor";

export default function CategoryChips({
  active,
  onSelect,
  total,
  allLabel = "All",
  visibleCategories,
  hiddenCount,
  expanded,
  onToggleExpand,
}) {
  if (!visibleCategories?.length) return null;

  return (
    <div className="filter-chips">
      <button
        type="button"
        className={`chip ${active === "ALL" ? "active" : ""}`}
        onClick={() => onSelect("ALL")}
      >
        {allLabel} <span className="chip-count">{total}</span>
      </button>

      {visibleCategories.map((c) => (
        <button
          key={c.label}
          type="button"
          className={`chip ${active === c.label ? "active" : ""}`}
          style={{ "--chip-color": categoryColor(c.label) }}
          onClick={() => onSelect(c.label)}
        >
          {c.label} <span className="chip-count">{c.count}</span>
        </button>
      ))}

      {hiddenCount > 0 && (
        <button type="button" className="chip chip-more" onClick={onToggleExpand}>
          {expanded ? "Show fewer ↑" : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
