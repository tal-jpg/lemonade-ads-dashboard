# Orbit Jobs — React + Express + MongoDB

The Orbit Jobs recruitment platform (UK + US markets) on the classic MERN-style split:

- **`backend/`** — **Express + MongoDB** (plain Node.js, no build step). All REST APIs, HMAC-cookie sessions, CV uploads, moderation, sitemaps/robots — and in production it also serves the built frontend.
- **`frontend/`** — **React 19 + Vite + TypeScript** single-page app. Instant client-side navigation (no server round-trip per page), tiny per-page fetches against the API, self-hosted fonts.

The complete feature set from the original build: search with synonyms/typo tolerance + full filters + facet counts, native 60-second applies + attributed partner link-outs, candidate dashboard (saves, alerts, tracker, CV manager, GDPR export/delete), employer dashboard + 3-step posting wizard with drafts and moderation, admin operations (queues, reports, classifier fixes, source kill-switches, audit log), the US market mirror with pay-transparency rules, and the SEO plumbing (JobPosting JSON-LD, per-page titles, sitemaps, robots).

---

## Quick start

Requires **Node.js 18.18+** and a MongoDB connection.

```bash
# 0) Install both apps (from the repo root)
npm run install-all          # or: cd backend && npm i && cd ../frontend && npm i

# 1) Point at your MongoDB (Atlas or local). Defaults to mongodb://127.0.0.1:27017
cp backend/.env.example backend/.env    # then edit MONGODB_URI if needed

# 2) Seed ~200 realistic jobs across both markets (drops + recreates collections)
npm run seed

# 3) Run both dev servers (API on :4000, app on :5173)
npm run dev
```

Open **http://localhost:5173** (UK) — the **US** tab in the header switches to `/us`.

The Vite dev server proxies `/api` (and the sitemap/robots endpoints) to Express on `:4000`, so cookies and downloads work with zero CORS setup.

### Run the pieces separately

```bash
cd backend  && npm run dev    # Express API on http://localhost:4000
cd frontend && npm run dev    # Vite dev server on http://localhost:5173
```

### Production

```bash
npm run build                 # builds frontend/dist
npm start                     # Express serves the API AND the built app on :4000
```

Any Node host works. Set the env vars from `backend/.env.example` (`MONGODB_URI`, a real `SESSION_SECRET`, `BASE_URL`); CV uploads land on local disk (`backend/data/uploads`), so use a persistent volume or swap `backend/src/uploads.js` for blob storage.

### MongoDB options

| Option | URI |
|---|---|
| **MongoDB Atlas** (recommended for deploys) | `mongodb+srv://user:pass@cluster.mongodb.net` — free M0 tier works |
| **Local MongoDB** | `mongodb://127.0.0.1:27017` (default) |
| **Docker** | `docker run -d -p 27017:27017 mongo:7` |

Set `MONGODB_URI` (and optionally `MONGODB_DB`, default `orbitjobs`) in `backend/.env`, then `npm run seed`.

## Demo accounts

| Role | Email | Password | Lands on |
|---|---|---|---|
| Candidate | amelia@demo.orbitjobs.example | demo1234 | /account |
| Employer | priya@thameslogistics.example | demo1234 | /employers/dashboard |
| Employer | daniel@plumline.example | demo1234 | /employers/dashboard |
| Employer (US) | maya@hudsonanalytics.example | demo1234 | /employers/dashboard |
| Admin | admin@orbitjobs.example | admin1234 | /admin |

The sign-in page has one-click buttons for these. Registering new candidate and employer accounts works end-to-end (first employer posting passes human moderation in /admin).

---

## Why this split is fast

- **SPA navigation.** After the first load, moving between pages never re-downloads the app — clicking a job, a specialism or a tab swaps views instantly and fetches only a small JSON payload.
- **No server rendering work per request.** Express only answers JSON (single-digit-millisecond handlers) and static files; there's no per-navigation React server render.
- **Self-hosted fonts** via `@fontsource` — no render-blocking Google Fonts request.
- **MongoDB indexes** on `status + location.country + postedAt`, `slug`, `employerId`, `specialism` cover every hot query.
- **Vite build** — hashed, tree-shaken, code-split static assets served with cache headers.

## Architecture

```
backend/
  server.js               # Express bootstrap: routers, sitemaps, static frontend, errors
  routes/                 # auth, jobs, me, employer, admin, meta, misc (alerts/contact/cv/out)
  src/                    # db.js (Mongo), auth.js (HMAC sessions), jobs.js (search),
                          # meta.js, uploads.js (multer CVs), sitemap.js, taxonomy.js
  scripts/
    aggregate.mjs         # partner-board aggregation pipeline (normalise → classify → dedup)
    seed.mjs              # builds the database from fixtures + the pipeline
  data/fixtures/          # taxonomies, companies, articles, sources, testimonials
  data/uploads/           # CV storage (gitignored)
frontend/
  src/
    App.tsx               # routes + link interception + scroll behaviour
    pages/                # one component per route (home, search, job, dashboards…)
    components/           # chrome (header/footer), providers (session/toasts/modals), views
    lib/                  # client.ts (API), types, taxonomy, format, icons, seo, hooks
  public/media/           # design assets (webp/video)
```

- **API contract is unchanged** from the original build — same `/api/*` paths, payloads, status codes (including the 410 closed-job payload), cookies and CSV/JSON exports.
- **Sessions** are HMAC-signed cookies (`SESSION_SECRET`) with bcrypt password hashes. Swap for a hosted auth provider when you need OAuth/password reset.
- **CV uploads** land on local disk (`backend/data/uploads`) via multer + `src/uploads.js`. For multi-instance deploys, swap that one module for S3/R2.
- **Aggregation** runs at seed time (`npm run seed`) and is deliberately isolated in `backend/scripts/` — production wires the same pipeline to a cron/worker per source schedule.
- **Search** pre-filters in Mongo (indexed) and applies the synonym/typo/facet logic in process; at tens of thousands of listings, move the text stage to Atlas Search — it's isolated in `backend/src/jobs.js`.
- **SEO note:** the app renders client-side. JSON-LD, titles and meta descriptions are still set per page, and sitemaps/robots are served by Express — but if search-engine indexing of every page is critical, put the site behind a prerender service or revisit SSR for the public pages.

## Environment (backend/.env)

| Variable | Default | Notes |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | Atlas SRV URIs supported |
| `MONGODB_DB` | `orbitjobs` | |
| `SESSION_SECRET` | demo value | **set a real secret in production** |
| `PORT` | `4000` | API (and production site) port |
| `BASE_URL` | `http://localhost:4000` | used in sitemaps + the outbound interstitial |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allow-origin (only used without the Vite proxy) |
| `UPLOAD_DIR` | `./data/uploads` | CV storage |

The frontend needs no env by default; set `VITE_API_URL` only if the API lives on another origin.
