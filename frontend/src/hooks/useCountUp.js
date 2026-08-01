import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up (or down) from its previous value to `target`
 * whenever `target` changes. Uses requestAnimationFrame with an ease-out
 * curve so it decelerates smoothly rather than ticking linearly.
 */
export function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof target !== "number" || Number.isNaN(target)) return undefined;

    const from = fromRef.current;
    const to = target;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
