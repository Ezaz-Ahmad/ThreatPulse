import { useEffect, useState } from "react";

/**
 * Reveals a list a page at a time instead of dumping everything on screen
 * at once. Resets back to the first page whenever the underlying list
 * changes identity (a new tab's data loaded, or a filter chip was toggled).
 */
export function useShowMore(list, initialCount = 10, step = 10) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [list, initialCount]);

  const safeList = list || [];
  const visible = safeList.slice(0, count);
  const remaining = Math.max(0, safeList.length - count);

  return {
    visible,
    total: safeList.length,
    shown: visible.length,
    remaining,
    hasMore: remaining > 0,
    // True once the user has expanded past the first page — lets the UI
    // offer a way back to "Show less" instead of being stuck fully expanded.
    canCollapse: count > initialCount,
    showMore: () => setCount((c) => Math.min(safeList.length, c + step)),
    showAll: () => setCount(safeList.length),
    reset: () => setCount(initialCount),
  };
}
