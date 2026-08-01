// Tiny inline area/line sparkline for a {date, count}[] series. No chart
// library needed for something this small — just a normalized SVG path.
export default function Sparkline({ data, color = "var(--accent)", height = 30 }) {
  if (!data || data.length < 2) return null;

  const values = data.map((d) => d.count);
  const max = Math.max(...values, 1);
  const width = 100;
  const step = width / (data.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - (v / max) * (height - 4) - 2;
    return [x, y];
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend over the last two weeks"
    >
      <path d={areaPath} fill={color} opacity="0.16" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
