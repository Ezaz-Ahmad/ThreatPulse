import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HeroClock from "./HeroClock";
import { api } from "../api";

const BOOT_LINES = [
  { text: "Connected to 6 threat intelligence sources", tag: "OK" },
  { text: "CISA KEV catalog synced", tag: "OK" },
  { text: "NVD CVE feed online", tag: "OK" },
  { text: "Monitoring ransomware leak sites", tag: "LIVE" },
];

const HEADLINE_REFRESH_MS = 15 * 60 * 1000; // re-fetch every 15 min so the ticker drifts fresh without a full reload
const TYPE_SPEED_MS = 24; // per character
const READ_PAUSE_MS = 3200; // hold the finished line long enough to read it
const VANISH_MS = 320; // fade-out duration before the next headline starts typing
const TITLE_MAX = 140; // cap so a long CVE description doesn't type forever

const KIND_META = {
  news: { label: "NEWS", color: "var(--accent)" },
  advisory: { label: "CISA", color: "var(--accent-2)" },
  cve: { label: "CVE", color: "var(--warn)" },
  kev: { label: "KEV", color: "var(--danger)" },
  ransomware: { label: "RANSOM", color: "var(--danger)" },
};

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// Pulls the latest items from every tracked source — not just the news
// feed — and interleaves them by recency, so the hero ticker reflects the
// whole picture (breaking news, fresh CISA advisories, newly published
// CVEs, new KEV entries, and new ransomware postings), newest first.
async function fetchTickerItems() {
  const [news, advisories, cves, kev, ransomware] = await Promise.all([
    api.news("?limit=6"),
    api.advisories("?limit=6"),
    api.cves("?limit=6"),
    api.kev("?limit=6"),
    api.ransomware("?limit=6"),
  ]);

  const items = [
    ...(news || []).map((n) => ({
      id: `news-${n.id}`,
      kind: "news",
      title: n.title,
      source: n.source,
      link: n.link,
      timestamp: n.published_at,
    })),
    ...(advisories || []).map((a) => ({
      id: `advisory-${a.id}`,
      kind: "advisory",
      title: a.title,
      source: "CISA",
      link: a.link,
      timestamp: a.published_at,
    })),
    ...(cves || []).map((c) => ({
      id: `cve-${c.id}`,
      kind: "cve",
      title: `${c.cve_id} — ${c.description || ""}`,
      source: "NVD",
      link: c.source_url,
      timestamp: c.published_at,
    })),
    ...(kev || []).map((k) => ({
      id: `kev-${k.id}`,
      kind: "kev",
      title: `Actively exploited: ${k.vulnerability_name}`,
      source: "CISA KEV",
      link: `https://nvd.nist.gov/vuln/detail/${k.cve_id}`,
      timestamp: k.date_added,
    })),
    ...(ransomware || []).map((r) => ({
      id: `ransomware-${r.id}`,
      kind: "ransomware",
      title: `${r.group_name} claims new victim: ${r.victim_name}`,
      source: "ransomware.live",
      link: r.link,
      timestamp: r.published_at,
    })),
  ]
    .filter((item) => item.title && item.timestamp)
    .map((item) => ({ ...item, title: truncate(item.title, TITLE_MAX) }));

  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return items.slice(0, 15);
}

export default function Hero() {
  const [headlines, setHeadlines] = useState([]);
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState("typing"); // "typing" | "pause" | "vanish"

  // Load the combined, most-recent-first feed, then keep it fresh on an
  // interval — independent of the once-a-day full page reload, so the
  // ticker drifts current even on a tab left open for a while.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const items = await fetchTickerItems();
        if (!cancelled && items.length) setHeadlines(items);
      } catch {
        // API unreachable — ticker just stays hidden, boot lines still show
      }
    }
    load();
    const refreshId = setInterval(load, HEADLINE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(refreshId);
    };
  }, []);

  // Keep the index valid if a refresh changes the list length.
  useEffect(() => {
    setIndex((i) => (headlines.length ? i % headlines.length : 0));
  }, [headlines.length]);

  // Type the current headline out one character at a time.
  useEffect(() => {
    if (!headlines.length) return undefined;
    const full = headlines[index % headlines.length]?.title ?? "";
    let charCount = 0;
    setDisplayText("");
    setPhase("typing");

    const typeId = setInterval(() => {
      charCount += 1;
      setDisplayText(full.slice(0, charCount));
      if (charCount >= full.length) {
        clearInterval(typeId);
        setPhase("pause");
      }
    }, TYPE_SPEED_MS);

    return () => clearInterval(typeId);
  }, [index, headlines]);

  // Hold the finished headline so it can be read, then start the vanish.
  useEffect(() => {
    if (phase !== "pause") return undefined;
    const t = setTimeout(() => setPhase("vanish"), READ_PAUSE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // After the fade-out finishes, advance to the next headline and repeat.
  useEffect(() => {
    if (phase !== "vanish") return undefined;
    const t = setTimeout(() => {
      setIndex((i) => (headlines.length ? (i + 1) % headlines.length : 0));
    }, VANISH_MS);
    return () => clearTimeout(t);
  }, [phase, headlines.length]);

  const current = headlines[index % headlines.length];
  const kindMeta = current ? KIND_META[current.kind] : null;

  return (
    <section className="hero">
      <div className="hero-eyebrow">
        <span className="pulse-dot" />
        Live Threat Intelligence
      </div>

      <h1 className="hero-title">
        Threat<span className="accent">Pulse</span>
      </h1>

      <p className="hero-tagline">
        A self-updating dashboard that pulls the latest cyber threats, CVEs, CISA
        advisories, and ransomware activity into one place — refreshed automatically
        from real public sources.
      </p>

      <div className="hero-panels">
        <div className="hero-terminal">
          <div className="hero-terminal-bar">
            <span></span><span></span><span></span>
          </div>
          {BOOT_LINES.map((line, i) => (
            <div
              key={line.text}
              className="hero-terminal-line"
              style={{ animationDelay: `${0.25 + i * 0.35}s` }}
            >
              <span className={line.tag === "OK" ? "tag-ok" : "tag-live"}>[{line.tag}]</span> {line.text}
            </div>
          ))}

          {current && (
            <div className="hero-ticker">
              <div className="hero-ticker-label">
                <span className="pulse-dot" />
                Live threat feed
              </div>
              {current.link ? (
                <a
                  href={current.link}
                  target="_blank"
                  rel="noreferrer"
                  className={`hero-ticker-line ${phase === "vanish" ? "is-vanishing" : ""}`}
                >
                  {kindMeta && (
                    <span className="hero-ticker-tag" style={{ color: kindMeta.color }}>
                      [{kindMeta.label}]{" "}
                    </span>
                  )}
                  {displayText}
                  <span className="hero-ticker-cursor" />
                </a>
              ) : (
                <div className={`hero-ticker-line ${phase === "vanish" ? "is-vanishing" : ""}`}>
                  {kindMeta && (
                    <span className="hero-ticker-tag" style={{ color: kindMeta.color }}>
                      [{kindMeta.label}]{" "}
                    </span>
                  )}
                  {displayText}
                  <span className="hero-ticker-cursor" />
                </div>
              )}
              <div className="hero-ticker-meta">
                {current.source}
                {current.timestamp && ` · ${timeAgo(current.timestamp)}`}
              </div>
            </div>
          )}
        </div>

        <HeroClock />
      </div>

      <div className="hero-cta-row">
        <Link to="/map" className="hero-scroll-cue">
          Global Threat Map <span className="arrow arrow-right">→</span>
        </Link>
        <Link to="/about" className="hero-scroll-cue outline">
          About This Project
        </Link>
        <a href="#dashboard" className="hero-scroll-cue outline">
          Skip to Dashboard
        </a>
      </div>
    </section>
  );
}
