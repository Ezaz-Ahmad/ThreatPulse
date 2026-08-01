export default function RadialProgress({ pct, color = "var(--accent)", size = 38 }) {
  const clamped = Math.min(Math.max(pct || 0, 0), 100);
  const strokeWidth = 4;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <svg
      className="radial-progress"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(clamped)} percent`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={strokeWidth} fill="none" />
      <circle
        className="radial-progress-arc"
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="radial-progress-text">
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}
