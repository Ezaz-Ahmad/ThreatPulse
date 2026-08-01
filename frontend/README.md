# ThreatPulse — Frontend

React + Vite dashboard UI for [ThreatPulse](../README.md). This README covers the frontend specifically — for what the project does, the live demo, the API it talks to, and full setup instructions, see the [root README](../README.md).

## Stack

React 19, React Router 7, Recharts (analytics charts), d3-geo + topojson-client (global threat map), Vite, Oxlint.

## Running locally

```bash
npm install
cp .env.example .env   # set VITE_API_BASE to your backend URL
npm run dev
```

Requires the backend running separately (see the [backend setup](../README.md#quick-start)) — the dashboard has nothing to render without it.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint |

## Structure

```
src/
  pages/        Home (main dashboard), MapPage (global threat map), AboutPage
  components/   Feed/table views (NewsList, CVETable, KEVTable, AdvisoryList, RansomwareTable),
                Hero (landing page + live ticker), StatCards, ThreatMap, CountryDirectory,
                AnalyticsPanel, and shared UI (SkeletonLoader, ShowMoreControl, HelpTip, ...)
  components/viz/  Small chart primitives used inside cards (Sparkline, RadialProgress, SeverityBar, MiniRankList)
  hooks/        useShowMore (paginated reveal), useCategoryFilter, useCountUp, useInView
  data/         Static reference data — glossary terms, mitigation guidance text, ISO country codes
  api.js        Thin fetch wrapper around every backend endpoint
```

`MapPage` is lazy-loaded (`App.jsx`) since it pulls in d3-geo and topojson-client, which the main dashboard route never needs.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE` | Base URL of the backend API | `http://localhost:8000` |

## Notes

- Pagination ("Show More") holds a short artificial delay (`useShowMore.js`) before revealing the next page — the data's already in memory, so without it the reveal is instant and reads as no feedback at all.
- The hero ticker (`Hero.jsx`) fetches from 5 endpoints independently via `Promise.allSettled`, not `Promise.all`, so one slow/failing source can't silently freeze the whole ticker.
