export default function ShowMoreControl({
  shown,
  total,
  remaining,
  hasMore,
  canCollapse,
  step,
  onShowMore,
  onShowAll,
  onReset,
}) {
  if (!hasMore && !canCollapse) return null;
  const pct = total ? Math.round((shown / total) * 100) : 0;

  return (
    <div className="show-more">
      <div className="show-more-track">
        <div className="show-more-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="show-more-row">
        <span className="show-more-status">
          {hasMore ? `Showing ${shown} of ${total}` : `Showing all ${total}`}
        </span>
        <div className="show-more-actions">
          {hasMore && (
            <button type="button" className="show-more-btn" onClick={onShowMore}>
              Show {Math.min(step, remaining)} More
              <span className="show-more-badge">{remaining} left</span>
            </button>
          )}
          {hasMore && (
            <button type="button" className="show-more-all" onClick={onShowAll}>
              Show all
            </button>
          )}
          {canCollapse && (
            <button type="button" className="show-more-all" onClick={onReset}>
              Show less
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
