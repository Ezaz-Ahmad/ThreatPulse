import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import CreatorCredit from "../components/CreatorCredit";
import ScrollButtons from "../components/ScrollButtons";

const FEATURES = [
  {
    n: "01",
    title: "Real-time aggregation",
    body: "Pulls from six news outlets, CISA advisories, the NVD, the KEV catalog, and ransomware leak sites — refreshed on a schedule, no manual checking required.",
  },
  {
    n: "02",
    title: "Built-in analytics",
    body: "Severity distributions, top ransomware groups, most-targeted sectors, and trend lines — the patterns behind the raw feed, not just a list of items.",
  },
  {
    n: "03",
    title: "Actively-exploited tracking",
    body: "Cross-references CISA's Known Exploited Vulnerabilities catalog so the flaws attackers are already using rise to the top, not just the newest CVEs.",
  },
  {
    n: "04",
    title: "Production engineering",
    body: "Automated tests, CI on every push, a Dockerized local stack, and a real three-tier cloud deployment — built the way a production service would be, not a script.",
  },
];

const STACK = [
  "FastAPI", "SQLAlchemy", "APScheduler", "React", "Vite", "Recharts",
  "PostgreSQL", "Docker", "GitHub Actions", "Render", "Vercel", "Neon",
];

const BENEFITS = [
  {
    tag: "Security Teams & Analysts",
    title: "One screen instead of ten tabs",
    body: "Skip the daily routine of checking CISA, the NVD, six news sites, and a leak-site tracker separately. Everything relevant shows up in one place, already sorted by severity.",
  },
  {
    tag: "Recruiters & Hiring Managers",
    title: "Working proof, not a bullet point",
    body: "A live, real full-stack build — backend ingestion, a real database, automated tests, CI, and a genuine cloud deployment — you can open right now instead of taking a résumé line on faith.",
  },
  {
    tag: "Students & Security Enthusiasts",
    title: "A live view of the real threat landscape",
    body: "Free to browse, no login — a practical way to see what current CVEs, advisories, and ransomware activity actually look like, instead of only reading about them.",
  },
];

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <div className="grid-backdrop" />
      <div className="about-page">
        <div className="about-page-nav">
          <Link to="/" className="back-link">
            <span className="arrow-left">←</span> Back to ThreatPulse
          </Link>
          <CreatorCredit variant="hero" />
        </div>

        <section className="about about-standalone in-view">
          <div className="about-intro">
            <div className="hero-eyebrow">
              <span className="pulse-dot" />
              About The Project
            </div>
            <h1 className="about-title">Why ThreatPulse Exists</h1>
            <p className="about-lede">
              Keeping up with the threat landscape means checking a dozen different places —
              a handful of security news sites, CISA&rsquo;s advisory feed, the NVD, and separate
              ransomware leak-site trackers — each with its own format and none of them talking
              to each other. <strong>ThreatPulse pulls all of it into a single, self-updating
              dashboard</strong>, so the full picture is visible at a glance instead of assembled
              by hand.
            </p>
            <p className="about-lede">
              It started as a way to go beyond tutorial projects: a real ingestion pipeline
              pulling from live public sources, a production-style deployment across three
              cloud services, and an interface built to be read quickly under pressure —
              the kind of system a security team would actually want open on a second monitor.
            </p>
          </div>

          <h2 className="about-section-title">What It Does</h2>
          <div className="about-feature-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.n}>
                <span className="feature-num">{f.n}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>

          <h2 className="about-section-title">Who Benefits</h2>
          <div className="benefit-grid">
            {BENEFITS.map((b) => (
              <div className="benefit-card" key={b.tag}>
                <span className="benefit-tag">{b.tag}</span>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </div>
            ))}
          </div>

          <div className="about-stack">
            <span className="about-stack-label">Built with</span>
            <div className="tech-chip-row">
              {STACK.map((s) => (
                <span className="tech-chip" key={s}>{s}</span>
              ))}
            </div>
          </div>

          <div className="about-cta">
            <Link to="/#dashboard" className="hero-scroll-cue">
              View Live Dashboard <span className="arrow arrow-right">→</span>
            </Link>
            <a href="https://github.com/Ezaz-Ahmad/ThreatPulse" target="_blank" rel="noreferrer" className="hero-scroll-cue outline">
              View Source on GitHub
            </a>
          </div>
        </section>

        <div className="footer-note about-page-footer">
          <div>
            ThreatPulse is an independent project and is not affiliated with CISA, NVD, or any
            of the news and threat-intelligence sources it aggregates.
          </div>
          <CreatorCredit variant="footer" />
        </div>
      </div>
      <ScrollButtons />
    </>
  );
}
