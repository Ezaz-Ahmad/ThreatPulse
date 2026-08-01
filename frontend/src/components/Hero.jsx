import HeroClock from "./HeroClock";
import CreatorCredit from "./CreatorCredit";

const BOOT_LINES = [
  { text: "Connected to 6 threat intelligence sources", tag: "OK" },
  { text: "CISA KEV catalog synced", tag: "OK" },
  { text: "NVD CVE feed online", tag: "OK" },
  { text: "Monitoring ransomware leak sites", tag: "LIVE" },
];

export default function Hero() {
  return (
    <section className="hero">
      <CreatorCredit variant="hero" />

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
        </div>

        <HeroClock />
      </div>

      <a href="#dashboard" className="hero-scroll-cue">
        View Live Dashboard <span className="arrow">↓</span>
      </a>
    </section>
  );
}
