import { useEffect } from "react";

// Home, the map, and About all shared index.html's single static <title>,
// so every browser tab/history entry read identically regardless of which
// page was open. This sets a distinct title per page and restores whatever
// was there before on unmount, so navigating away (including via the
// browser back button while a title is still settling) never leaves a
// stale title behind.
export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title;
    if (title) document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
