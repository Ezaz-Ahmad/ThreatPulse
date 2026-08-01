function severityClass(sev) {
  if (!sev) return "";
  const s = sev.toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

export default function CVETable({ items }) {
  if (!items?.length) return <div className="empty-state">No CVEs yet. Try refreshing.</div>;
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>CVE</th>
          <th>Severity</th>
          <th>Score</th>
          <th>Description</th>
          <th>Published</th>
        </tr>
      </thead>
      <tbody>
        {items.map((c) => (
          <tr key={c.id}>
            <td><a href={c.source_url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{c.cve_id}</a></td>
            <td>{c.severity ? <span className={`badge ${severityClass(c.severity)}`}>{c.severity}</span> : "-"}</td>
            <td>{c.cvss_score ?? "-"}</td>
            <td style={{ maxWidth: 420 }}>{c.description}</td>
            <td>{c.published_at ? new Date(c.published_at).toLocaleDateString() : "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
