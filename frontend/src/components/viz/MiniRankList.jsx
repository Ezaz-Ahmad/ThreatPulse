export default function MiniRankList({ items, labelKey, countKey, color = "var(--danger)" }) {
  if (!items?.length) return null;
  const max = Math.max(...items.map((i) => i[countKey]), 1);

  return (
    <div className="mini-rank-list">
      {items.map((item) => (
        <div className="mini-rank-row" key={item[labelKey]}>
          <span className="mini-rank-label">{item[labelKey]}</span>
          <span className="mini-rank-track">
            <span className="mini-rank-fill" style={{ width: `${(item[countKey] / max) * 100}%`, background: color }} />
          </span>
          <span className="mini-rank-count">{item[countKey]}</span>
        </div>
      ))}
    </div>
  );
}
