import { useMemo, useState } from "react";

/**
 * Generic category-chip filter. Categories are derived from the live data
 * itself (via getCategory), so if a brand-new source, sector, or vendor
 * shows up in a future ingest, a chip for it appears automatically —
 * nothing hardcoded to update by hand.
 */
export function useCategoryFilter(items, getCategory, options = {}) {
  const { unknownLabel = "Other", maxVisible = 6 } = options;
  const [active, setActive] = useState("ALL");
  const [expanded, setExpanded] = useState(false);

  const labelOf = (item) => {
    const raw = getCategory(item);
    const trimmed = raw == null ? "" : String(raw).trim();
    return trimmed || unknownLabel;
  };

  const categories = useMemo(() => {
    const counts = new Map();
    (items || []).forEach((item) => {
      const label = labelOf(item);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const visibleCategories = expanded ? categories : categories.slice(0, maxVisible);
  const hiddenCount = Math.max(0, categories.length - visibleCategories.length);

  const filtered = useMemo(() => {
    if (!items) return items;
    if (active === "ALL") return items;
    return items.filter((item) => labelOf(item) === active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, active]);

  return {
    active,
    setActive,
    total: items?.length || 0,
    categories,
    visibleCategories,
    hiddenCount,
    expanded,
    setExpanded,
    filtered,
  };
}
