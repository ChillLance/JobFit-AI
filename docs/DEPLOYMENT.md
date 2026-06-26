# JobFit-AI Deployment Guide

This document describes how to run JobFit-AI locally, build for production, configure environment variables, and what to expect when deploying the current MVP.

JobFit-AI is a **local-first portfolio MVP**. Profiles live in the browser; jobs and stored analysis results live in `jobs_temp.json` on the machine running the Next.js server. Plan deployments accordingly.

---

## 1. Prerequisites

- **Node.js** 20+ (matches `@types/node` in `package.json`)
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
| Jobs + analysis on job records | `jobs_temp.json` (project root) | Gitignored; created/updated by API routes and server pages |
| Career profiles | Browser `localStorage` | Per browser/device; not on the server |
| Reference seed profile | `user_profile.json` | Committed reference; not the runtime profile store |

Ensure the process user can read and write `jobs_temp.json` in the project root.

---

## 6. Deploying to hosted platforms

### Recommended for this MVP: local or single VM

Because the app writes `jobs_temp.json` with Node `fs`, the **simplest reliable deployment** is:

- Run `npm run build && npm run start` on one long-lived host, **or**
- Use the project locally for portfolio demos

### Vercel / serverless caveats

You can deploy the Next.js app to Vercel or similar, but be aware:

- **Ephemeral filesystem:** `jobs_temp.json` may not persist across invocations or redeploys unless you attach durable storage.
- **Profiles still client-only:** `localStorage` is per browser; hosted URL does not sync profiles across devices.
- **API routes** that read/write jobs need a writable path; the current MVP assumes a local file on disk.

For a portfolio demo, prefer **local `npm run dev`** or a **single Node host** with a persistent disk.

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

The README references a **Chrome Extension** for collection; extension source is **not** in this repository. Any HTTP client with the same payload works.

After collecting, refresh the home page (`GET /api/jobs`) to see jobs.

---

## 8. API routes (deployment-relevant)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/collect` | Append job to `jobs_temp.json` |
| `GET` | `/api/jobs` | List jobs |
| `DELETE` | `/api/jobs/[id]` | Delete job |
| `PATCH` | `/api/jobs/[id]/status` | Update application status |
| `POST` | `/api/jobs/[id]/analyze` | Local profile-driven analysis |
| `POST` | `/api/jobs/[id]/analyze/deep` | Gemini analysis (`GEMINI_API_KEY`) |
| `POST` | `/api/jobs/[id]/analyze/groq` | Groq analysis (`GROQ_API_KEY`) |

Job detail reads `jobs_temp.json` on the server; there is no `GET /api/jobs/[id]`.

Successful analyze calls **persist results on the job record** in `jobs_temp.json`.

---

## 9. Security checklist

- [ ] `GEMINI_API_KEY` and `GROQ_API_KEY` only in server env (`.env.local` / host secrets)
- [ ] `.env.local` not committed
- [ ] `jobs_temp.json` not committed if it contains real job data
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

For reviewers and interview demos:

1. Clone the repo and `npm install`.
2. Copy `.env.local` only if demonstrating Gemini/Groq.
3. `npm run dev` (fastest) or `npm run build && npm run start`.
4. Pre-seed `jobs_temp.json` via collect API or copy from a local dev machine (do not commit private postings).
5. Import or create two profiles with clearly different deal breakers/locations.
6. Follow the demo script in [QA.md](./QA.md#14-manual-demo-script).

---

## 12. Known deployment limitations

- No built-in authentication or multi-user isolation.
- No cloud profile sync; profiles are per browser.
- Job store is a single JSON file, not a database.
- Hosted serverless deploys may lose `jobs_temp.json` between runs.
- Chrome Extension is external to this repo.
- `ANALYZE_MODE` does not yet act as a single global provider switch in the UI.

See also README **Notes and Limitations** and [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 13. Related documentation

- [QA.md](./QA.md) — Manual QA checklist and demo script
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design and data flow
- [README.md](../README.md) — Project overview and getting started
