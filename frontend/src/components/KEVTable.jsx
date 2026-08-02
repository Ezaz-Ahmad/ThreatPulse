import { useMemo, useState } from "react";
import { useShowMore } from "../hooks/useShowMore";
import ShowMoreControl from "./ShowMoreControl";
import { categoryColor } from "../utils/categoryColor";

const MAX_VISIBLE_VENDORS = 6;
const UNSPECIFIED_VENDOR = "Unspecified Vendor";

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

function vendorLabel(k) {
  const v = k.vendor_project?.trim();
  return v || UNSPECIFIED_VENDOR;
}

export default function KEVTable({ items }) {
  // "active" is either "ALL", "RANSOMWARE" (a pinned, always-present filter),
  // or a vendor name — vendor chips are derived live from the data, so any
  // new vendor that shows up in a future ingest gets its own chip for free.
  const [active, setActive] = useState("ALL");
  const [expanded, setExpanded] = useState(false);

  const ransomwareCount = useMemo(
    () => items?.filter((k) => k.known_ransomware_use === "Known").length || 0,
    [items]
  );

  const vendorCounts = useMemo(() => {
    const counts = new Map();
    (items || []).forEach((k) => {
      const label = vendorLabel(k);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [items]);

  const visibleVendors = expanded ? vendorCounts : vendorCounts.slice(0, MAX_VISIBLE_VENDORS);
  const hiddenCount = Math.max(0, vendorCounts.length - visibleVendors.length);

  const filtered = useMemo(() => {
    if (!items) return items;
    if (active === "ALL") return items;
    if (active === "RANSOMWARE") return items.filter((k) => k.known_ransomware_use === "Known");
    return items.filter((k) => vendorLabel(k) === active);
  }, [items, active]);

  const { visible, shown, total, remaining, hasMore, canCollapse, pending, pendingMore, pendingAll, showMore, showAll, reset } = useShowMore(filtered, 10, 10);

  if (!items?.length) return <div className="empty-state">No KEV entries yet. Try refreshing.</div>;

  return (
    <div>
      <div className="filter-chips">
        <button type="button" className={`chip ${active === "ALL" ? "active" : ""}`} onClick={() => setActive("ALL")}>
          All <span className="chip-count">{items.length}</span>
        </button>
        <button
          type="button"
          className={`chip ${active === "RANSOMWARE" ? "active" : ""}`}
          style={{ "--chip-color": "var(--danger)" }}
          onClick={() => setActive("RANSOMWARE")}
        >
          Ransomware-linked <span className="chip-count">{ransomwareCount}</span>
        </button>
        {visibleVendors.map((v) => (
          <button
            key={v.label}
            type="button"
            className={`chip ${active === v.label ? "active" : ""}`}
            style={{ "--chip-color": categoryColor(v.label) }}
            onClick={() => setActive(v.label)}
          >
            {v.label} <span className="chip-count">{v.count}</span>
          </button>
        ))}
        {hiddenCount > 0 && (
          <button type="button" className="chip chip-more" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Show fewer ↑" : `+${hiddenCount} more`}
          </button>
        )}
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
                <a
                  href={`https://nvd.nist.gov/vuln/detail/${k.cve_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="item-title"
                >
                  {k.vulnerability_name}
                </a>
              </div>
              <div className="item-meta">
                <a
                  href={`https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${encodeURIComponent(k.cve_id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="badge source"
                  title="View in CISA's KEV catalog"
                >
                  {k.cve_id}
                </a>
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
        canCollapse={canCollapse}
        pending={pending}
        pendingMore={pendingMore}
        pendingAll={pendingAll}
        step={10}
        onShowMore={showMore}
        onShowAll={showAll}
        onReset={reset}
      />
    </div>
  );
}
