<h1 align="center">🛡️ ThreatPulse</h1>

<p align="center">
  <b>A live, self-updating cyber threat intelligence dashboard.</b><br/>
  Aggregates security news, CISA advisories, CVEs, exploited-vulnerability data, and ransomware activity into one place — with real-time analytics.
</p>

<p align="center">
  <img alt="CI" src="https://github.com/Ezaz-Ahmad/ThreatPulse/actions/workflows/ci.yml/badge.svg" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
</p>

<p align="center">
  <a href="#live-demo">Live Demo</a> ·
  <a href="#key-features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#api-reference">API Reference</a>
</p>

---

## Why this exists

Security teams (and anyone tracking the threat landscape) have to check a dozen
different places — news sites, CISA's site, NVD, ransomware leak-site
trackers — just to stay current. **ThreatPulse pulls all of it into a single
dashboard**, refreshes itself on a schedule, and turns the raw feeds into
charts: severity breakdowns, top ransomware groups, targeted sectors, and
volume trends over time.

## Live Demo

**🔗 [threat-pulse-phi.vercel.app](https://threat-pulse-phi.vercel.app)**

## Key Features

- 📰 **Aggregated news** — pulls from The Hacker News, BleepingComputer, Krebs
  on Security, Dark Reading, SecurityWeek, and The Record
- 🏛️ **Official advisories** — live CISA advisories feed
- 🎯 **Known Exploited Vulnerabilities** — the CISA KEV catalog, flagged by
  ransomware association
- 🧬 **CVE tracking** — recent vulnerabilities from the NVD API with CVSS
  score and severity
- 🔓 **Ransomware tracker** — recent leak-site victim postings
- 📊 **Built-in analytics** — news volume, severity distribution, top
  ransomware groups, most-targeted sectors, KEV timeline — charted, not just
  listed
- ⏱️ **Self-updating** — background scheduler refreshes every source on a
  configurable interval, plus a manual "Refresh Now" button
- ✅ **Tested** — 20+ automated tests (ingestion parsing + API layer), CI
  runs on every push
- 🐳 **Containerized** — one `docker compose up` gets the full stack running
  locally, database included

## Screenshot

> _Add a screenshot or short GIF of the dashboard here — this is the first
> thing recruiters look at._

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy, APScheduler |
| Frontend | React, Vite, Recharts |
| Database | PostgreSQL (production) / SQLite (local dev) |
| Testing | Pytest, FastAPI TestClient |
| CI/CD | GitHub Actions |
| Deployment | Docker, Render, Vercel, Neon |

## Architecture

```
backend/    FastAPI + SQLAlchemy + APScheduler   -> REST API, background ingestion, analytics
frontend/   React + Vite + Recharts               -> dashboard UI
```

- **Ingestion split by design:** every data source has a `fetch_*()`
  function (does the network call) and a `process_*()` function (pure
  parsing/upsert logic, no network) — this is what makes ingestion unit
  testable offline, without hitting live APIs in CI.
- **Dedup by design:** all ingestion is upsert-based (matched on URL/CVE
  ID/etc.), so re-running it never creates duplicates.
- **Database-agnostic:** SQLite locally, Postgres in production — switched
  with a single `DATABASE_URL` environment variable, no code changes.

## Quick Start

### Option A — Docker Compose (fastest, one command)

```bash
docker compose up --build
```

Starts Postgres, the backend (`localhost:8000`), and the frontend
(`localhost:5173`) together.

### Option B — run manually

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string (falls back to local SQLite if unset) | _(sqlite)_ |
| `UPDATE_INTERVAL_HOURS` | How often the scheduler re-fetches all sources | `6` |
| `NVD_API_KEY` | Free key from nvd.nist.gov, raises the CVE API rate limit | _(none)_ |
| `CVE_LOOKBACK_DAYS` | How many days back to pull modified CVEs | `3` |

## Testing & CI

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

20+ tests cover ingestion parsers (via fixture RSS/JSON, no network needed)
and the API layer (isolated test database). `.github/workflows/ci.yml` runs
the full suite plus a frontend production build on every push/PR.

## Deployment

Live and free, using:

1. **[Neon](https://neon.tech)** — free, permanent Postgres database
2. **[Render](https://render.com)** — free FastAPI backend hosting (auto-deploys from GitHub, includes a `Dockerfile`)
3. **[Vercel](https://vercel.com)** — free React frontend hosting
4. **GitHub Actions** — a scheduled workflow (`scheduled-refresh.yml`) pings the backend every 6 hours to keep data fresh and wake it from Render's free-tier sleep

Set `DATABASE_URL` (Render) to your Neon connection string, and
`VITE_API_BASE` (Vercel) to your Render URL — that's the only wiring needed.

## API Reference

| Endpoint | Description |
|---|---|
| `GET /api/news` | News items (`?search=`, `?source=`, `?limit=`) |
| `GET /api/advisories` | CISA advisories (`?search=`, `?limit=`) |
| `GET /api/cves` | Recent CVEs (`?search=`, `?min_score=`, `?limit=`) |
| `GET /api/kev` | KEV catalog (`?search=`, `?ransomware_only=`, `?limit=`) |
| `GET /api/ransomware` | Ransomware victims (`?group=`, `?limit=`) |
| `GET /api/stats` | Summary counts for the dashboard header |
| `GET /api/analytics/news-volume` | Daily news counts (`?days=`) |
| `GET /api/analytics/severity-distribution` | CVE counts by severity |
| `GET /api/analytics/top-ransomware-groups` | Top groups by victim count (`?limit=`, `?days=`) |
| `GET /api/analytics/top-sectors` | Top targeted sectors (`?limit=`, `?days=`) |
| `GET /api/analytics/kev-timeline` | Daily KEV catalog additions (`?days=`) |
| `POST /api/refresh` | Trigger an immediate ingestion run |

## Roadmap

- [ ] User accounts + saved watchlists (track specific vendors/CVEs/groups)
- [ ] Live alerts via Slack/Discord/email on critical CVEs or new KEV entries
- [ ] Interactive world map of ransomware activity by country
- [ ] Historical trend comparisons (week-over-week, month-over-month)

## Notes on data source reliability

- `ransomware.live`'s exact JSON field names have shifted across API
  versions before. `backend/app/ingest/ransomware.py` reads several
  plausible key names defensively — if a live run logs 0 new ransomware
  records, print one raw record and adjust the `_first(...)` key lookups.
- CISA has changed feed URLs before; check cisa.gov for the current
  advisories RSS link if that feed ever returns nothing.

## Author

**Ezaz Ahmad**
GitHub: [@Ezaz-Ahmad](https://github.com/Ezaz-Ahmad)
_Add your LinkedIn / portfolio link here._

## License

MIT — see [LICENSE](LICENSE).
