import { useCountUp } from "../hooks/useCountUp";
import { useInView } from "../hooks/useInView";

function AnimatedValue({ value, active }) {
  const isNumber = typeof value === "number" && !Number.isNaN(value);
  const animated = useCountUp(isNumber && active ? value : 0, 900);
  if (!isNumber) return <>{value ?? "-"}</>;
  return <>{animated.toLocaleString()}</>;
}

export default function StatCards({ stats }) {
  const [ref, inView] = useInView();

  if (!stats) return null;

  const cards = [
    { label: "News Articles", value: stats.total_news },
    { label: "News (7d)", value: stats.news_last_7_days },
    { label: "CISA Advisories", value: stats.total_advisories },
    { label: "Tracked CVEs", value: stats.total_cves },
    { label: "KEV Catalog", value: stats.total_kev },
    { label: "KEV + Ransomware", value: stats.kev_ransomware_flagged },
    { label: "Ransomware Victims", value: stats.total_ransomware },
    { label: "Ransomware (7d)", value: stats.ransomware_last_7_days },
  ];

  return (
    <div className={`stats-grid ${inView ? "in-view" : ""}`} ref={ref}>
      {cards.map((c, i) => (
        <div className="stat-card" key={c.label} style={{ animationDelay: `${i * 0.07}s` }}>
          <div className="value"><AnimatedValue value={c.value} active={inView} /></div>
          <div className="label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
