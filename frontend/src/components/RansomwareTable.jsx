export default function RansomwareTable({ items }) {
  if (!items?.length) return <div className="empty-state">No ransomware activity recorded yet. Try refreshing.</div>;
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Group</th>
          <th>Victim</th>
          <th>Sector</th>
          <th>Country</th>
          <th>Published</th>
        </tr>
      </thead>
      <tbody>
        {items.map((r) => (
          <tr key={r.id}>
            <td><span className="badge ransomware">{r.group_name}</span></td>
            <td>{r.link ? <a href={r.link} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{r.victim_name}</a> : r.victim_name}</td>
            <td>{r.sector ?? "-"}</td>
            <td>{r.country ?? "-"}</td>
            <td>{r.published_at ? new Date(r.published_at).toLocaleDateString() : "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
