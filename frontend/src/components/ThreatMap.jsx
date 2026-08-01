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
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const dragRef = useRef(null);

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
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [view.x, view.y]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * WIDTH;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * HEIGHT;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragRef.current.moved = true;
    setView((v) => ({ ...v, x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }));
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

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
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          {!geo && (
            <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" className="threat-map-loading-text">
              Loading map…
            </text>
          )}
          {geo?.features.map((f, i) => {
            const code = ALPHA2_BY_ISO_NUMERIC[f.id];
            const entry = code ? byAlpha2.get(code) : null;
            const intensity = entry ? Math.max(0.14, Math.sqrt(entry.count / maxCount)) : 0;
            return (
              <path
                // A handful of small/unrecognized territories in the 110m
                // atlas have no numeric "id" at all, which would otherwise
                // collide on key={undefined} — fall back to the index for
                // just those.
                key={f.id ?? `feature-${i}`}
                d={pathGen(f)}
                className={`map-country ${entry ? "has-data" : ""} ${selected === code ? "is-selected" : ""}`}
                style={entry ? { "--intensity": intensity } : undefined}
                onMouseMove={(e) => (entry ? showHoverFor(code, entry, e) : setHover(null))}
                onMouseLeave={() => setHover(null)}
                onClick={() => entry && onSelectCountry(code === selected ? null : code)}
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
