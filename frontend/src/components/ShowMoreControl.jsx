export default function ShowMoreControl({ shown, total, remaining, hasMore, step, onShowMore, onShowAll }) {
  if (!hasMore) return null;
  const pct = total ? Math.round((shown / total) * 100) : 0;

  return (
    <div className="show-more">
      <div className="show-more-track">
        <div className="show-more-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="show-more-row">
        <span className="show-more-status">
          Showing {shown} of {total}
        </span>
        <div className="show-more-actions">
          <button type="button" className="show-more-btn" onClick={onShowMore}>
            Show {Math.min(step, remaining)} More
            <span className="show-more-badge">{remaining} left</span>
          </button>
          <button type="button" className="show-more-all" onClick={onShowAll}>
            Show all
          </button>
        </div>
      </div>
    </div>
  );
}
