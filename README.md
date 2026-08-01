# ThreatPulse

![CI](https://github.com/Ezaz-Ahmad/ThreatPulse/actions/workflows/ci.yml/badge.svg)

A self-hosted dashboard that continuously collects the latest cybersecurity
news, official advisories, vulnerabilities, and ransomware activity, and
turns it into a live, chart-driven view of the current threat landscape.

**Live demo:** _add your deployed URL here once hosted_

## What it collects

- **News** — RSS from The Hacker News, BleepingComputer, Krebs on Security,
  Dark Reading, SecurityWeek, and The Record.
- **CISA Advisories** — official advisories RSS feed.
- **CISA KEV Catalog** — the Known Exploited Vulnerabilities catalog (flags
  which CVEs are being actively exploited, and which are tied to ransomware).
- **CVEs** — recently published/modified vulnerabilities from the NVD API,
  with CVSS score and severity.
- **Ransomware Tracker** — recent victims posted to ransomware leak sites,
  via the public ransomware.live API.

Data refreshes automatically on a schedule (every 6 hours by default) and can
also be refreshed on demand from the dashboard.

## Analytics

Beyond raw feeds, the dashboard computes and charts:

- News volume over the last 30 days
- CVE severity distribution
- Top ransomware groups by victim count (last 90 days)
- Most-targeted sectors (last 90 days)
- KEV catalog additions over time

Charts are lazy-loaded (code-split) so the main dashboard bundle stays small.

## Architecture

```
backend/    FastAPI + SQLAlchemy + APScheduler   -> REST API, background ingestion, analytics
frontend/   React + Vite + Recharts               -> dashboard UI
```

- **Database:** SQLite by default (zero setup for local dev). Set
  `DATABASE_URL` to a Postgres connection string for production — required
  on most free hosting, since their filesystems are ephemeral and would wipe
  a local SQLite file on every restart.
- **Ingestion:** every source has a `fetch_*()` function (does the network
  call) and a `process_*()` function (pure parsing/upsert logic, no network).
  That split is what makes the ingestion logic unit-testable offline.
- **Dedup:** all ingestion is upsert-based (matched on URL/CVE ID/etc.), so
  re-running it never creates duplicates and is safe to run as often as
  you like.

## Testing & CI

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

20+ tests cover the ingestion parsers (via fixture RSS/JSON, no network
needed) and the API endpoints (via an isolated in-memory-style test database).
`.github/workflows/ci.yml` runs the backend test suite and a frontend
production build on every push/PR — replace `YOUR_USERNAME/YOUR_REPO` in the
badge URL above once this is pushed to GitHub.

## Local setup

### Option A — Docker Compose (full stack, one command)

```bash
docker compose up --build
```

This starts Postgres, the backend (http://localhost:8000), and the frontend
(http://localhost:5173) together, wired up automatically.

### Option B — run each piece manually

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

Environment variables (backend, optional):

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string (falls back to local SQLite if unset) | _(sqlite)_ |
| `UPDATE_INTERVAL_HOURS` | How often the built-in scheduler re-fetches all sources | `6` |
| `NVD_API_KEY` | Free key from nvd.nist.gov, raises the CVE API rate limit | _(none)_ |
| `CVE_LOOKBACK_DAYS` | How many days back to pull modified CVEs | `3` |

## Deploying it for free

This combination gives you a live URL with a real, persistent Postgres
database, at $0/month:

**1. Database — [Neon](https://neon.tech)**
Create a free project, copy the connection string it gives you (starts with
`postgresql://`).

**2. Backend — [Render](https://render.com)**
- New Web Service → connect your GitHub repo → root directory `backend`
- Render auto-detects the `Dockerfile`, or set build command
  `pip install -r requirements.txt` and start command
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add environment variable `DATABASE_URL` = the Neon connection string
- Deploy — you'll get a URL like `https://your-app.onrender.com`

Note: Render's free tier spins the service down after 15 minutes idle
(cold starts take ~30-60s on the next request) and gives 750 free instance
hours/month — plenty for a portfolio demo.

**3. Frontend — [Vercel](https://vercel.com)**
- New Project → import the repo → root directory `frontend`
- Build command `npm run build`, output directory `dist`
- Environment variable `VITE_API_BASE` = your Render backend URL
- Deploy — you'll get a URL like `https://your-app.vercel.app`

**4. Keep data fresh even while the backend sleeps**
`.github/workflows/scheduled-refresh.yml` pings `POST /api/refresh` on a cron
schedule (every 6 hours) — this both refreshes data and wakes the service
back up. Set a repository variable `BACKEND_URL` to your Render URL
(Settings → Secrets and variables → Actions → Variables) to enable it.

Put the resulting Vercel URL at the top of this README as your live demo
link.

## Notes on data source reliability

This project was originally built in a sandboxed dev environment with
restricted outbound network access, so some ingestion endpoints could only
be verified against public documentation rather than live traffic. Worth
checking on your first real run:

- `ransomware.live`'s exact JSON field names have shifted across API
  versions before. `backend/app/ingest/ransomware.py` reads several
  plausible key names defensively — if a live run logs 0 new ransomware
  records, print one raw record from the API response and adjust the
  `_first(...)` key lookups.
- CISA has changed feed URLs before; if the advisories feed returns nothing,
  check cisa.gov for the current advisories RSS link.

## API reference

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
