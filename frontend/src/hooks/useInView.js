import { useCallback, useRef, useState } from "react";

/**
 * Returns [ref, inView]. `inView` flips to true the first time the element
 * scrolls into the viewport, and stays true afterwards (one-shot reveal -
 * we don't want content re-animating every time someone scrolls past it).
 *
 * Uses a callback ref (not a plain ref object) so the observer attaches the
 * moment React actually mounts the target node - important here because the
 * target can mount on a *later* render (e.g. once async data arrives), and a
 * plain useEffect(..., []) would have already run against a null ref by then
 * and never observe anything.
 */
export function useInView(options) {
  const [inView, setInView] = useState(false);
  const observerRef = useRef(null);

  const ref = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true); // graceful fallback for very old browsers
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -60px 0px", ...options }
    );

    observer.observe(node);
    observerRef.current = observer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
}
