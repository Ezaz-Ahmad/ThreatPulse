export default function StatCards({ stats }) {
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
    <div className="stats-grid">
      {cards.map((c) => (
        <div className="stat-card" key={c.label}>
          <div className="value">{c.value ?? "-"}</div>
          <div className="label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
