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
  pending = false,
  pendingMore = pending,
  pendingAll = pending,
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
          {pending ? (
            <>
              <span className="spinner" /> Loading…
            </>
          ) : hasMore ? (
            `Showing ${shown} of ${total}`
          ) : (
            `Showing all ${total}`
          )}
        </span>
        <div className="show-more-actions">
          {hasMore && (
            <button type="button" className="show-more-btn" disabled={pending} onClick={onShowMore}>
              {pendingMore ? (
                <span className="spinner" />
              ) : (
                <>
                  Show {Math.min(step, remaining)} More
                  <span className="show-more-badge">{remaining} left</span>
                </>
              )}
            </button>
          )}
          {hasMore && (
            <button type="button" className="show-more-all" disabled={pending} onClick={onShowAll}>
              {pendingAll ? <span className="spinner" /> : "Show all"}
            </button>
          )}
          {canCollapse && (
            <button type="button" className="show-more-all" disabled={pending} onClick={onReset}>
              Show less
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
