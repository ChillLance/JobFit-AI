# JobFit-AI Deployment Guide

This document describes how to run JobFit-AI locally, build for production, configure environment variables, and what to expect when deploying the current MVP.

JobFit-AI is a **local-first portfolio MVP**. Jobs, stored analysis results, and a server-side mirror of the active profile store live in `data/jobfit.sqlite` on the machine running the Next.js server. The browser's `localStorage` profile store remains the primary UI store and syncs to the server after changes. Plan deployments around persistent local disk.

---

## 1. Prerequisites

- **Node.js** 24 (the CI baseline; required for the built-in `node:sqlite` API)
- **npm** (or compatible package manager)
- A modern browser for the UI
- Optional: API keys for Gemini and/or Groq deep analysis

---

## 2. Local Development

### Install dependencies

```bash
npm install
```

### Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` (never commit this file). See [Environment variables](#3-environment-variables).

### Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Primary UI copy is Traditional Chinese.

### Verify before demo or deploy

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

For a manual QA pass, use [QA.md](./QA.md).

---

## 3. Environment variables

Server-side only (read in API routes / `src/lib/aiConfig.ts`). Do not expose keys to the client.

| Variable | Required for | Default / notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | `POST /api/jobs/[id]/analyze/deep` | Empty = route returns a clear configuration error |
| `GROQ_API_KEY` | `POST /api/jobs/[id]/analyze/groq` | Not in `.env.example`; add to `.env.local` |
| `GROQ_MODEL` | Groq (optional) | Defaults to `llama-3.3-70b-versatile` in the groq route |
| `ANALYZE_MODE` | — | Documented in `.env.example`; read by `getAnalyzeMode()` in `src/lib/aiConfig.ts`. Providers are selected explicitly in the job detail UI today |
| `DEMO_MODE` | — | `true` = server-side job/profile storage switches to in-memory (see §6 DEMO_MODE). Default/unset = normal SQLite-backed storage |
| `NEXT_PUBLIC_DEMO_MODE` | — | Client-exposed by design (Next.js `NEXT_PUBLIC_*` convention) — inlined into the browser bundle to show the demo banner. Keep this equal to `DEMO_MODE` |

### Example `.env.local`

```env
# From .env.example
GEMINI_API_KEY=
ANALYZE_MODE=local

# Add for Groq (not listed in .env.example)
GROQ_API_KEY=
GROQ_MODEL=
```

**Local analysis** (`POST /api/jobs/[id]/analyze`) works **without** any API keys.

**Note:** `.env.example` comments may lag the codebase; Gemini and Groq routes are implemented and used when keys are set.

---

## 4. npm scripts

From `package.json`:

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `next dev` | Development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve production build (run after `build`) |
| `lint` | `eslint` | Lint the project |
| `test` | `vitest run` | Unit tests for analysis, filtering, salary parsing, and repositories |
| `test:watch` | `vitest` | Run tests in watch mode |

There is no separate `typecheck` script; use `npx tsc --noEmit`.

---

## 5. Production build (self-hosted)

On a machine or VM with a persistent filesystem:

```bash
npm install
npm run build
npm run start
```

Default URL: [http://localhost:3000](http://localhost:3000) (set `PORT` if your host requires it).

### Data files

| Data | Location | Notes |
| --- | --- | --- |
| Jobs + analysis on job records | `data/jobfit.sqlite` | Gitignored; read and written only through the server-side repositories |
| Career profiles | Browser `localStorage` + SQLite mirror | The UI source of truth stays per browser; each write is mirrored to the server for analysis |
| Legacy job snapshot | `jobs_temp.json` | Gitignored, read once only to migrate an empty SQLite store; never rewritten |
| Reference seed profile | `user_profile.json` | Committed reference; not the runtime profile store |

Ensure the process user can create and write the `data/` directory.

---

## 6. Deploying to hosted platforms

### Recommended for this MVP: local or single VM

Because the app writes its SQLite database to local disk, the **simplest reliable deployment** is:

- Run `npm run build && npm run start` on one long-lived host, **or**
- Use the project locally for portfolio demos

### Vercel / serverless caveats

You can deploy the Next.js app to Vercel or similar, but be aware:

- **Ephemeral filesystem:** `data/jobfit.sqlite` may not persist across invocations or redeploys unless you attach durable storage.
- **Profiles are not multi-user:** the browser store is still per browser and the server-side mirror is app-wide; this is not account-based sync.
- **API routes** that read/write jobs or profiles need a persistent writable path; the current MVP assumes local disk.
- **`node:sqlite` availability:** the SQLite-backed repositories require Node's built-in `node:sqlite`, which may not exist on every serverless Node runtime version. See **DEMO_MODE** below if you need a deployment that avoids it entirely.

For a portfolio demo with real persistence, prefer **local `npm run dev`** or a **single Node host** with a persistent disk. For a public, shareable, read-only-ish demo on Vercel's free tier, use **DEMO_MODE** instead (next section).

### DEMO_MODE: public demo deployment on Vercel

`DEMO_MODE` swaps the SQLite-backed job/profile repositories for in-memory
ones seeded from `data/demo-jobs.json` (see README's [Public demo
(DEMO_MODE)](../README.md#public-demo-demo_mode) section for the full
rationale). This is the recommended way to put JobFit-AI behind a public URL
without provisioning a durable disk.

**Setup:**

1. Deploy the repo to Vercel as a normal Next.js project (no special build command needed).
2. In the Vercel project's **Environment Variables**, add:

   | Variable | Value |
   | --- | --- |
   | `DEMO_MODE` | `true` |
   | `NEXT_PUBLIC_DEMO_MODE` | `true` |

   Both must be set to the same value — `DEMO_MODE` switches the server-side
   storage layer; `NEXT_PUBLIC_DEMO_MODE` is inlined into the browser bundle
   at build time and only controls the visible demo banner. Setting one
   without the other leaves the banner and the actual storage layer out of
   sync.
3. Redeploy (env var changes require a new build in Vercel).
4. Do **not** set `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` on
   a public demo unless you intend to expose paid AI analysis to anonymous
   visitors — local analysis works without any keys and is what the seeded
   demo jobs already show.

**Limitations specific to DEMO_MODE:**

- All data (the 7 seeded demo jobs, any status changes, any profile created
  through `/profiles`) lives in server process memory only. It resets on
  every cold start, redeploy, and — on Vercel specifically — is **not
  shared across concurrent serverless invocations**, so two visitors hitting
  different function instances can see different in-memory state. This is
  acceptable for a portfolio demo, not for anything resembling real usage.
  - `POST /api/collect` still works in DEMO_MODE (it just writes to the
    in-memory store instead of SQLite) but collected jobs won't persist or
    be visible to other visitors.
- The demo banner (driven by `NEXT_PUBLIC_DEMO_MODE`) is the only visible
  indicator that data is fictional/ephemeral — don't disable it independently
  of `DEMO_MODE`.

### Environment variables on the host

Set the same variables as `.env.local` in the platform dashboard (e.g. Vercel **Environment Variables**). Use production/staging scopes as appropriate.

Never commit `.env.local` or real API keys (`.gitignore` excludes `.env*` except `.env.example`).

---

## 7. Collecting jobs in deployed environments

Jobs are created via:

```http
POST /api/collect
Content-Type: application/json

{
  "title": "...",
  "url": "...",
  "rawText": "..."
}
```

The collection Chrome Extension source is included in `extension/`. Any HTTP client with the same payload also works.

After collecting, refresh the home page (`GET /api/jobs`) to see jobs.

---

## 8. API routes (deployment-relevant)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/collect` | Add a job to SQLite |
| `GET` | `/api/jobs` | List jobs |
| `DELETE` | `/api/jobs/[id]` | Delete job |
| `PATCH` | `/api/jobs/[id]/status` | Update application status |
| `POST` | `/api/profile-sync` | Mirror the browser profile store to SQLite |
| `POST` | `/api/jobs/[id]/analyze` | Local profile-driven analysis |
| `POST` | `/api/jobs/[id]/analyze/deep` | Gemini analysis (`GEMINI_API_KEY`) |
| `POST` | `/api/jobs/[id]/analyze/groq` | Groq analysis (`GROQ_API_KEY`) |
| `POST` | `/api/jobs/[id]/analyze/openrouter` | OpenRouter analysis |

Job detail reads jobs through the SQLite repository on the server; there is no `GET /api/jobs/[id]`.

Successful analyze calls **persist results on the job record** in SQLite.

---

## 9. Security checklist

- [ ] `GEMINI_API_KEY` and `GROQ_API_KEY` only in server env (`.env.local` / host secrets)
- [ ] `.env.local` not committed
- [ ] `data/jobfit.sqlite` not committed if it contains real job data
- [ ] HTTPS in production if exposed to the internet
- [ ] Treat AI output as decision support, not authoritative advice

---

## 10. Post-deploy smoke test

1. Home page (`/`) loads.
2. `GET /api/jobs` returns JSON (empty array is OK).
3. `POST /api/collect` adds a job; home page shows it after refresh.
4. `/profiles` and `/profiles/import` load.
5. Local analyze works without API keys.
6. With keys set, Gemini/Groq routes return results or clear errors (not 500 crashes).
7. Run items in [QA.md](./QA.md) sections 1–2.

---

## 11. Portfolio demo deployment

Two options depending on whether you control the host:

### Local / self-hosted (full features, real persistence)

For reviewers and interview demos on a machine or VM you control:

1. Clone the repo and `npm install`.
2. Copy `.env.local` only if demonstrating Gemini/Groq.
3. `npm run dev` (fastest) or `npm run build && npm run start`.
4. Seed jobs with `npm run demo` or the collect API (do not commit private postings).
5. Import or create two profiles with clearly different deal breakers/locations.
6. Follow the demo script in [QA.md](./QA.md#14-manual-demo-script).

### Public URL (Vercel free tier, read-mostly)

For a shareable link (e.g. a portfolio/resume link) where you don't want to
manage a persistent host: deploy with `DEMO_MODE=true` and
`NEXT_PUBLIC_DEMO_MODE=true` — see §6 **DEMO_MODE: public demo deployment on
Vercel** above for the full setup and its limitations (in-memory storage,
resets on cold start, not shared across concurrent instances).

---

## 12. Known deployment limitations

- No built-in authentication or multi-user isolation.
- No account-based or cross-device profile sync; the browser store is per browser.
- Job storage is a local SQLite database, not managed cloud storage.
- Hosted serverless deploys may lose `data/jobfit.sqlite` between runs.
- Chrome Extension source is included but not published to a browser extension store.
- `ANALYZE_MODE` does not yet act as a single global provider switch in the UI.

See also README **Notes and Limitations** and [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 13. Related documentation

- [QA.md](./QA.md) — Manual QA checklist and demo script
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design and data flow
- [README.md](../README.md) — Project overview and getting started
