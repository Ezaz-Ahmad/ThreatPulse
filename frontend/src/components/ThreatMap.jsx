import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { ALPHA2_BY_ISO_NUMERIC } from "../data/isoNumericByAlpha2";

const WIDTH = 960;
const HEIGHT = 500;
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const WHEEL_STEP = 1.25;

export function regionName(code) {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase());
  } catch {
    return code;
  }
}

function clampScale(s) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

// A world choropleth built by hand with d3-geo + topojson-client rather than
// a full mapping library (react-simple-maps etc.) — keeps the dependency
// footprint small and gives full control over the zoom/pan interactions and
// the app's own color language (CSS custom properties + color-mix, same as
// the rest of the dashboard) instead of a library's own theming system.
export default function ThreatMap({ data, selected, onSelectCountry }) {
  const [geo, setGeo] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [hover, setHover] = useState(null); // { code, name, count, topGroup, topSector, clientX, clientY }
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  // Which country's path the pointer went down on, so pointerup can decide
  // "was this a click or the end of a drag" without depending on the
  // browser's native click event — see handlePointerUp for why.
  const pressedRef = useRef(null);
  // Coalesces rapid pointermove events into at most one setView() per
  // animation frame instead of one per raw event (a mouse can report
  // dozens of move events a second) — see handlePointerMove for why this
  // matters.
  const rafRef = useRef(null);
  const pendingPointRef = useRef(null);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/countries-110m.json")
      .then((r) => {
        if (!r.ok) throw new Error("bad response");
        return r.json();
      })
      .then((topology) => {
        if (cancelled) return;
        setGeo(feature(topology, topology.objects.countries));
      })
      .catch(() => !cancelled && setLoadError("Could not load the world map outline."));
    return () => {
      cancelled = true;
    };
  }, []);

  const byAlpha2 = useMemo(() => {
    const m = new Map();
    (data || []).forEach((d) => m.set(d.country, d));
    return m;
  }, [data]);

  const maxCount = useMemo(
    () => (data && data.length ? Math.max(...data.map((d) => d.count)) : 1),
    [data]
  );

  const projection = useMemo(() => {
    if (!geo) return null;
    return geoNaturalEarth1().fitSize([WIDTH, HEIGHT], geo);
  }, [geo]);

  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // Panning/zooming only ever changes the <g transform> - the underlying
  // path geometry never changes with it. Previously pathGen(f) ran inline
  // inside the JSX .map() below, which recomputed all ~250 country path
  // strings via d3-geo on *every* render, including every single one
  // triggered by a drag's pointermove (which can fire dozens of times a
  // second). That's a genuine perf cliff - sustained dragging could stall
  // the main thread badly enough to cause visible rendering glitches
  // (dropped/black frames). Computing this once per geo/projection change
  // instead of once per pointer event fixes that at the source.
  const paths = useMemo(() => {
    if (!geo || !pathGen) return [];
    return geo.features.map((f, i) => ({
      key: f.id ?? `feature-${i}`,
      feature: f,
      code: ALPHA2_BY_ISO_NUMERIC[f.id],
      d: pathGen(f),
    }));
  }, [geo, pathGen]);

  const toViewBoxPoint = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT,
    };
  }, []);

  const zoomBy = useCallback((factor, anchor) => {
    setView((v) => {
      const newScale = clampScale(v.scale * factor);
      if (newScale === v.scale) return v;
      const k = newScale / v.scale;
      const ax = anchor ? anchor.x : WIDTH / 2;
      const ay = anchor ? anchor.y : HEIGHT / 2;
      return { scale: newScale, x: ax - k * (ax - v.x), y: ay - k * (ay - v.y) };
    });
  }, []);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const anchor = toViewBoxPoint(e.clientX, e.clientY);
      zoomBy(e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, anchor);
    },
    [toViewBoxPoint, zoomBy]
  );

  const handlePointerDown = useCallback((e) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y, moved: false };
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [view.x, view.y]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    // Stash the latest pointer position and, if a frame isn't already
    // pending, schedule exactly one setView() on the next animation frame.
    // Without this, a fast/jittery mouse can fire pointermove far more
    // often than the screen can actually repaint, each one triggering a
    // full React re-render - previously that also meant recomputing every
    // country's path geometry (see `paths` above), which together could
    // stall the main thread badly enough to produce visible black/dropped
    // frames during a sustained drag.
    pendingPointRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const point = pendingPointRef.current;
      if (!point || !dragRef.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((point.clientX - dragRef.current.startX) / rect.width) * WIDTH;
      const dy = ((point.clientY - dragRef.current.startY) / rect.height) * HEIGHT;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragRef.current.moved = true;
      setView((v) => ({ ...v, x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }));
    });
  }, []);

  // Selection is decided here rather than via a native onClick on each
  // <path>. setPointerCapture() above (needed so dragging the map still
  // works smoothly once the pointer leaves the country you started on)
  // makes the browser retarget the follow-up pointer/mouse events — and the
  // synthetic "click" that derives from them — to the capturing <svg>
  // instead of the country path the user actually pressed. That silently
  // ate every click. Tracking "which country was pressed" + "did the
  // pointer move enough to count as a drag" ourselves sidesteps that
  // entirely and works the same across mouse, touch, and pen.
  const handlePointerUp = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const drag = dragRef.current;
    const code = pressedRef.current;
    if (drag && !drag.moved && code) {
      const entry = byAlpha2.get(code);
      if (entry) onSelectCountry(code === selected ? null : code);
    }
    pressedRef.current = null;
    dragRef.current = null;
    setIsDragging(false);
  }, [byAlpha2, onSelectCountry, selected]);

  const resetView = () => setView({ scale: 1, x: 0, y: 0 });

  const showHoverFor = (code, entry, e) => {
    if (!code || !entry) return;
    const wrapRect = wrapRef.current.getBoundingClientRect();
    setHover({
      code,
      name: regionName(code) || code,
      count: entry.count,
      topGroup: entry.top_group,
      topSector: entry.top_sector && entry.top_sector !== "Not Found" ? entry.top_sector : null,
      x: e.clientX - wrapRect.left,
      y: e.clientY - wrapRect.top,
    });
  };

  if (loadError) return <div className="error-state">{loadError}</div>;

  return (
    <div className="threat-map-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="threat-map-svg"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="img"
        aria-label="World map showing ransomware incident activity by country"
      >
        <g
          transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}
          style={{ transition: isDragging ? "none" : "transform 0.2s var(--ease-out)" }}
        >
          {!geo && (
            <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" className="threat-map-loading-text">
              Loading map…
            </text>
          )}
          {paths.map(({ key, code, d }) => {
            const entry = code ? byAlpha2.get(code) : null;
            const intensity = entry ? Math.max(0.14, Math.sqrt(entry.count / maxCount)) : 0;
            return (
              <path
                // A handful of small/unrecognized territories in the 110m
                // atlas have no numeric "id" at all, which would otherwise
                // collide on key={undefined} — fall back to the index for
                // just those (handled when `paths` is built).
                key={key}
                d={d}
                className={`map-country ${entry ? "has-data" : ""} ${selected === code ? "is-selected" : ""}`}
                style={entry ? { "--intensity": intensity } : undefined}
                onMouseMove={(e) => (entry ? showHoverFor(code, entry, e) : setHover(null))}
                onMouseLeave={() => setHover(null)}
                onPointerDown={() => {
                  pressedRef.current = entry ? code : null;
                }}
                tabIndex={entry ? 0 : -1}
                role={entry ? "button" : undefined}
                aria-label={entry ? `${regionName(code) || code}: ${entry.count} incidents` : undefined}
                onFocus={(e) => {
                  if (!entry) return;
                  // FocusEvent has no clientX/clientY — anchor the tooltip
                  // to the focused shape's own bounding box instead.
                  const rect = e.target.getBoundingClientRect();
                  showHoverFor(code, entry, { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
                }}
                onBlur={() => setHover(null)}
                onKeyDown={(e) => {
                  if (!entry) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectCountry(code === selected ? null : code);
                  }
                }}
              />
            );
          })}
        </g>
      </svg>

      {hover && (
        <div className="map-tooltip" style={{ left: hover.x, top: hover.y }}>
          <strong>{hover.name}</strong>
          <span>{hover.count} incident{hover.count === 1 ? "" : "s"} tracked</span>
          {hover.topGroup && <span className="map-tooltip-muted">Most active group: {hover.topGroup}</span>}
          {hover.topSector && <span className="map-tooltip-muted">Top sector: {hover.topSector}</span>}
          <span className="map-tooltip-cta">Click for details →</span>
        </div>
      )}

      <div className="map-zoom-controls">
        <button type="button" className="map-zoom-btn" onClick={() => zoomBy(WHEEL_STEP)} aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" className="map-zoom-btn" onClick={() => zoomBy(1 / WHEEL_STEP)} aria-label="Zoom out" title="Zoom out">–</button>
        <button type="button" className="map-zoom-btn map-zoom-reset" onClick={resetView} aria-label="Reset view" title="Reset view">⟲</button>
      </div>

      <div className="map-legend">
        <span className="map-legend-label">Fewer incidents</span>
        <span className="map-legend-bar" aria-hidden="true" />
        <span className="map-legend-label">More incidents</span>
        <span className="map-legend-swatch" aria-hidden="true" />
        <span className="map-legend-label">No recorded activity</span>
      </div>
    </div>
  );
}
