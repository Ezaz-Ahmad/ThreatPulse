import { useMemo, useState } from "react";
import { useShowMore } from "../hooks/useShowMore";
import ShowMoreControl from "./ShowMoreControl";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

function DueBadge({ dueDate }) {
  if (!dueDate) return <span className="due-plain">-</span>;
  const days = daysUntil(dueDate);
  const dateLabel = new Date(dueDate).toLocaleDateString();
  if (days < 0) return <span className="badge critical">Overdue &middot; {dateLabel}</span>;
  if (days <= 7) return <span className="badge high">Due soon &middot; {dateLabel}</span>;
  return <span className="due-plain">Due {dateLabel}</span>;
}

export default function KEVTable({ items }) {
  const [ransomwareOnly, setRansomwareOnly] = useState(false);

  const ransomwareCount = useMemo(
    () => items?.filter((k) => k.known_ransomware_use === "Known").length || 0,
    [items]
  );

  const filtered = useMemo(() => {
    if (!items) return items;
    return ransomwareOnly ? items.filter((k) => k.known_ransomware_use === "Known") : items;
  }, [items, ransomwareOnly]);

  const { visible, shown, total, remaining, hasMore, showMore, showAll } = useShowMore(filtered, 10, 10);

  if (!items?.length) return <div className="empty-state">No KEV entries yet. Try refreshing.</div>;

  return (
    <div>
      <div className="filter-chips">
        <button type="button" className={`chip ${!ransomwareOnly ? "active" : ""}`} onClick={() => setRansomwareOnly(false)}>
          All <span className="chip-count">{items.length}</span>
        </button>
        <button
          type="button"
          className={`chip ${ransomwareOnly ? "active" : ""}`}
          style={{ "--chip-color": "var(--danger)" }}
          onClick={() => setRansomwareOnly(true)}
        >
          Ransomware-linked <span className="chip-count">{ransomwareCount}</span>
        </button>
      </div>

      <div className="card-list">
        {visible.map((k, i) => {
          const isRansomware = k.known_ransomware_use === "Known";
          return (
            <div
              className="item-card"
              key={k.id}
              style={{ animationDelay: `${Math.min(i, 12) * 0.04}s`, "--severity-color": isRansomware ? "var(--danger)" : "var(--accent-2)" }}
            >
              <div className="item-card-head">
                <span className="item-title">{k.vulnerability_name}</span>
              </div>
              <div className="item-meta">
                <span className="badge source">{k.cve_id}</span>
                <span>{k.vendor_project}{k.product ? ` / ${k.product}` : ""}</span>
              </div>
              <div className="item-meta">
                {isRansomware && <span className="badge ransomware">Actively used by ransomware</span>}
                <span>Added {k.date_added ? new Date(k.date_added).toLocaleDateString() : "-"}</span>
                <DueBadge dueDate={k.due_date} />
              </div>
            </div>
          );
        })}
      </div>

      <ShowMoreControl
        shown={shown}
        total={total}
        remaining={remaining}
        hasMore={hasMore}
        step={10}
        onShowMore={showMore}
        onShowAll={showAll}
      />
    </div>
  );
}
