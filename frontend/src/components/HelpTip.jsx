import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const POPOVER_WIDTH = 230;
const GAP = 10;
const VIEWPORT_PADDING = 12;

// Small "?" trigger with a hover/focus popover explaining a term in plain
// language. Position is computed on the fly from the trigger's real screen
// location (rather than CSS-anchored under it) so the popover always opens
// into whichever direction has room and never overlaps unrelated content —
// e.g. a sibling card in the next grid row. A <span role="button"> rather
// than a real <button> so it can be safely nested inside other clickable
// elements (like the stat cards); clicks are stopped from bubbling so
// tapping the hint never triggers the parent's own click handler.
//
// The popover is rendered through a portal straight into <body>. This
// matters: several ancestors (e.g. .stat-card on :hover) animate with a
// CSS `transform`, and per spec a `transform` on an ancestor makes it the
// containing block for any `position: fixed` descendant — silently turning
// "fixed to the viewport" into "fixed to that card's box" and flinging the
// popover to the wrong spot the moment its card is hovered. A portal
// sidesteps that entirely.
export default function HelpTip({ title, children }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);
  const [direction, setDirection] = useState("up");
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    // Small safety buffer on top of the measured height — guards against the
    // very first open, where fonts/layout may not be fully settled yet.
    const popHeight = (popRef.current?.offsetHeight || 110) + 12;
    const required = popHeight + GAP + VIEWPORT_PADDING;

    let left = trigger.left + trigger.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING));

    const spaceAbove = trigger.top;
    const spaceBelow = window.innerHeight - trigger.bottom;

    // Prefer whichever side actually fits; if neither fully fits, pick the
    // one with more room rather than defaulting blindly downward — that's
    // what let the popover crowd into the card sitting in the next grid row.
    let openDown;
    if (spaceAbove >= required) openDown = false;
    else if (spaceBelow >= required) openDown = true;
    else openDown = spaceBelow > spaceAbove;

    const top = openDown ? trigger.bottom + GAP : trigger.top - popHeight - GAP;
    const arrowLeft = trigger.left + trigger.width / 2 - left;

    setDirection(openDown ? "down" : "up");
    setStyle({ left: `${left}px`, top: `${top}px`, "--arrow-left": `${arrowLeft}px` });
  }, []);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  useLayoutEffect(() => {
    if (!open) return undefined;
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  const stop = (e) => e.stopPropagation();

  return (
    <span className="help-tip" onClick={stop} onMouseDown={stop}>
      <span
        ref={triggerRef}
        className="help-tip-trigger"
        role="button"
        tabIndex={0}
        aria-label={`What does ${title} mean?`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        ?
      </span>
      {open &&
        createPortal(
          <span
            ref={popRef}
            className={`help-tip-popover help-tip-${direction}`}
            role="tooltip"
            style={style || { visibility: "hidden" }}
          >
            <strong>{title}</strong>
            <span>{children}</span>
          </span>,
          document.body
        )}
    </span>
  );
}
