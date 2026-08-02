import { useMemo, useState } from "react";
import { useShowMore } from "../hooks/useShowMore";
import ShowMoreControl from "./ShowMoreControl";
import { regionName } from "./ThreatMap";
import { ISO_NUMERIC_BY_ALPHA2 } from "../data/isoNumericByAlpha2";

function sectorLabel(s) {
  if (!s || s === "Not Found") return null;
  return s;
}

// Full A-to-Z country list, not just the handful with the most activity.
// Every ISO-3166 country is shown, including the ones with zero recorded
// incidents — that's the point: it's meant to make the true scope (and the
// limits) of the data honest at a glance, not just spotlight the worst
// offenders. Selecting a row here drives the exact same `selected` state as
// the map and the "Most-Affected Countries" shortlist, so all three stay in
// sync with each other and with the detail panel.
export default function CountryDirectory({ data, selected, onSelectCountry }) {
  const [search, setSearch] = useState("");

  const merged = useMemo(() => {
    const byCode = new Map((data || []).map((d) => [d.country, d]));
    const all = Object.keys(ISO_NUMERIC_BY_ALPHA2).map((code) => {
      const entry = byCode.get(code);
      return {
        country: code,
        name: regionName(code) || code,
        count: entry?.count || 0,
        top_group: entry?.top_group || null,
        top_sector: sectorLabel(entry?.top_sector) || null,
      };
    });
    all.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return all;
  }, [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return merged;
    const q = search.trim().toLowerCase();
    return merged.filter((c) => c.name.toLowerCase().includes(q));
  }, [merged, search]);

  const { visible, shown, total, remaining, hasMore, canCollapse, pending, pendingMore, pendingAll, showMore, showAll, reset } =
    useShowMore(filtered, 15, 15);

  const withData = useMemo(() => merged.filter((c) => c.count > 0).length, [merged]);

  return (
    <div className="country-directory">
      <div className="country-directory-head">
        <h2 className="about-section-title">All Countries</h2>
        <span className="country-directory-summary">
          {withData} of {merged.length} countries have recorded activity · updates automatically
        </span>
      </div>

      <input
        type="search"
        className="country-directory-search"
        placeholder="Search countries…"
        aria-label="Search countries"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="country-directory-list">
        <div className="country-directory-row country-directory-row-head" aria-hidden="true">
          <span>Country</span>
          <span>Incidents</span>
          <span>Most active group</span>
          <span>Top sector</span>
        </div>
        {visible.map((c, i) => (
          <button
            type="button"
            key={c.country}
            className={`country-directory-row ${selected === c.country ? "active" : ""} ${c.count === 0 ? "is-empty" : ""}`}
            style={{ animationDelay: `${(i % 15) * 25}ms` }}
            onClick={() => onSelectCountry(c.country === selected ? null : c.country)}
          >
            <span className="country-directory-name">{c.name}</span>
            <span className="country-directory-count">{c.count || "0"}</span>
            <span className="country-directory-muted country-directory-group">
              {c.top_group || (c.count === 0 ? "No recorded activity" : "—")}
            </span>
            <span className="country-directory-muted country-directory-sector">
              {c.top_sector || "—"}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">No countries match &quot;{search}&quot;.</div>
        )}
      </div>

      {filtered.length > 0 && (
        <ShowMoreControl
          shown={shown}
          total={total}
          remaining={remaining}
          hasMore={hasMore}
          canCollapse={canCollapse}
          pending={pending}
          pendingMore={pendingMore}
          pendingAll={pendingAll}
          step={15}
          onShowMore={showMore}
          onShowAll={showAll}
          onReset={reset}
        />
      )}
    </div>
  );
}
