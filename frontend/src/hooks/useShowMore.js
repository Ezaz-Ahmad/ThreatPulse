import { useEffect, useRef, useState } from "react";

// The list is already fully loaded in memory, so revealing more of it is
// instant — which reads as no feedback at all when you click the button.
// Holding the button in a "pending" state for a beat before the next page
// appears (mirrored by ShowMoreControl showing a spinner) makes the action
// feel deliberate instead of just teleporting new rows onto the screen.
const REVEAL_DELAY_MS = 550;

/**
 * Reveals a list a page at a time instead of dumping everything on screen
 * at once. Resets back to the first page whenever the underlying list
 * changes identity (a new tab's data loaded, or a filter chip was toggled).
 */
export function useShowMore(list, initialCount = 10, step = 10) {
  const [count, setCount] = useState(initialCount);
  // Which action is in flight — 'more' | 'all' | null — rather than a plain
  // boolean, so "Show More" and "Show all" can each show their own spinner
  // instead of both dimming identically when only one was actually clicked.
  const [pendingAction, setPendingAction] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setCount(initialCount);
    setPendingAction(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [list, initialCount]);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  const safeList = list || [];
  const visible = safeList.slice(0, count);
  const remaining = Math.max(0, safeList.length - count);

  const revealAfterDelay = (nextCount, action) => {
    setPendingAction(action);
    timerRef.current = setTimeout(() => {
      setCount(nextCount);
      setPendingAction(null);
    }, REVEAL_DELAY_MS);
  };

  return {
    visible,
    total: safeList.length,
    shown: visible.length,
    remaining,
    hasMore: remaining > 0,
    // True once the user has expanded past the first page — lets the UI
    // offer a way back to "Show less" instead of being stuck fully expanded.
    canCollapse: count > initialCount,
    pending: pendingAction !== null,
    pendingMore: pendingAction === "more",
    pendingAll: pendingAction === "all",
    showMore: () => revealAfterDelay(Math.min(safeList.length, count + step), "more"),
    showAll: () => revealAfterDelay(safeList.length, "all"),
    reset: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingAction(null);
      setCount(initialCount);
    },
  };
}
