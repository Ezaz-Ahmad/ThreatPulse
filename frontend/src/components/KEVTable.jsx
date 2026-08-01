export default function KEVTable({ items }) {
  if (!items?.length) return <div className="empty-state">No KEV entries yet. Try refreshing.</div>;
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>CVE</th>
          <th>Vendor / Product</th>
          <th>Vulnerability</th>
          <th>Ransomware Use</th>
          <th>Date Added</th>
          <th>Due Date</th>
        </tr>
      </thead>
      <tbody>
        {items.map((k, i) => (
          <tr key={k.id} style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
            <td>{k.cve_id}</td>
            <td>{k.vendor_project} {k.product ? `/ ${k.product}` : ""}</td>
            <td style={{ maxWidth: 320 }}>{k.vulnerability_name}</td>
            <td>{k.known_ransomware_use === "Known" ? <span className="badge ransomware">Known</span> : "No"}</td>
            <td>{k.date_added ? new Date(k.date_added).toLocaleDateString() : "-"}</td>
            <td>{k.due_date ? new Date(k.due_date).toLocaleDateString() : "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
