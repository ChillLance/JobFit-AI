# JobFit-AI Current Context

## Current Status

JobFit-AI is a local Next.js-based job tracking and AI job-fit analysis tool.

### MVP 0.2 — Application Status Tracking — Complete

The status management flow is done end-to-end:

- Detail page can update job status via `StatusSelect` and `PATCH /api/jobs/[id]/status`.
- Home page job cards show application status badges.
- Home page has client-side status filter tabs with counts per status.
- Missing or invalid job status is treated as `not_applied` (UI label: 未投遞).

Also in place from earlier work:

- Chrome Extension collects job postings into `jobs_temp.json`.
- Home page lists jobs with AI score/level and links to `/jobs/[id]`.
- Job detail page includes AI score panel (`ScorePanel`) and mock scoring API with persistence.

## Current Focus: MVP 0.3 — Job Fit Analysis — In Progress

The current phase targets **profile-aware job-fit analysis** using `user_profile.json`, local rule-based analysis, and optional Gemini deep analysis.

### MVP 0.3 — TASK-015 Complete

**MVP 0.3 Job Fit Analysis** has completed **TASK-015** (Gemini deep analysis integration).

Current behavior:

- The job detail page is wired to **Gemini deep analysis**.
- Users can manually click **「開始 Gemini 深度分析」** or **「重新分析」** (`AnalyzeFitPanel`).
- API endpoint: **`POST /api/jobs/[id]/analyze/deep`** (`src/app/api/jobs/[id]/analyze/deep/route.ts`).
- Gemini model remains **`gemini-3.5-flash`** (API key in `.env.local` only; never commit).
- On success, the result is persisted on the job as **`deepAnalysis`** in `jobs_temp.json`.
- The detail page **prefers `deepAnalysis`** when present; otherwise it shows the local rule-based analysis from `POST /api/jobs/[id]/analyze`.
- Gemini JSON parsing has been hardened:
  - `responseMimeType: application/json`
  - Low temperature (`0.1`)
  - Prompt JSON rules (no markdown fences, no trailing commas)
  - Markdown fence stripping
  - Trailing-comma repair
  - Control-character cleanup
  - JSON object extraction from noisy responses
  - On parse failure: error response includes **`details`** and **`preview`** for debugging

### Earlier MVP 0.3 milestones (summary)

- **TASK-007:** `user_profile.json` at project root.
- **TASK-008–009:** Analyze Fit UI placeholder and local `POST /api/jobs/[id]/analyze` (read-only rule-based analysis).
- **TASK-010+:** Analyze Fit button wired; local analysis display; persistence and UI iterations through TASK-014.

### Repository state

- Git working tree confirmed **clean** after TASK-015.

## Immediate Next Task

- **TASK-016:** Add **deepAnalysis cache / TTL** to avoid repeated Gemini API usage when a fresh result already exists.
  - If a job already has `deepAnalysis` and it has not expired, return the cached result.
  - Support **`force: true`** (or equivalent) to bypass cache and re-call Gemini when the user clicks **重新分析**.
  - Suggested metadata fields: `metadata.createdAt`, `metadata.model`, `metadata.profileVersion`, optional `cacheExpiresAt`.
  - API keys stay in `.env.local` only; do not commit secrets.

## Do Not Do Yet

- Database migration
- Login / authentication
- Cloud sync
- Calendar integration
- Resume / cover letter generation
- Large UI redesign
