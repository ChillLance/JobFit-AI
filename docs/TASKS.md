# JobFit-AI Tasks

## Current Phase: MVP 0.3 — Job Fit Analysis

Focus: profile-aware job-fit analysis with local rules and optional Gemini deep analysis.

## Current Task

### TASK-016 Add deepAnalysis cache / TTL

**Status:** Next

**Goal:**

- If a job already has `deepAnalysis` and it has **not expired**, return the cached result without calling Gemini again.
- When the user explicitly re-runs analysis (**重新分析**), allow **`force: true`** (or equivalent request flag) to bypass cache and call Gemini again.
- Reduce duplicate Gemini API consumption and cost.

**Suggested fields:**

- `metadata.createdAt` — when the deep analysis was generated
- `metadata.model` — e.g. `gemini-3.5-flash`
- `metadata.profileVersion` — tie cache validity to profile changes
- Optional `cacheExpiresAt` — explicit TTL expiry timestamp on the stored `deepAnalysis` object

**Constraints:**

- API key must remain in **`.env.local` only**; never commit `.env.local` or secrets.
- Preserve existing `deepAnalysis` display priority on the detail page.
- Keep `POST /api/jobs/[id]/analyze/deep` as the deep-analysis endpoint.

**Likely files:**

```txt
src/app/api/jobs/[id]/analyze/deep/route.ts
src/app/jobs/[id]/AnalyzeFitPanel.tsx
```

---

## Completed Tasks

### MVP 0.3 — Job Fit Analysis

#### TASK-015 Gemini Deep Analysis API and UI — Done

**Completion summary:**

- Added **Gemini deep analysis API**: `POST /api/jobs/[id]/analyze/deep` (`src/app/api/jobs/[id]/analyze/deep/route.ts`), model **`gemini-3.5-flash`**.
- **`AnalyzeFitPanel`** wired to the API; manual **「開始 Gemini 深度分析」** / **「重新分析」** buttons.
- **`page.tsx`** passes **`initialDeepAnalysis`** from the job record into the panel.
- Successful runs **persist `deepAnalysis`** on the job in `jobs_temp.json`; detail page **shows deep analysis first**, local rule-based analysis as fallback.
- **JSON parsing and error handling** strengthened (`responseMimeType`, low temperature, prompt rules, fence/comma/control-char cleanup, object extraction, `details`/`preview` on parse failure).

#### TASK-007 Create user_profile.json Data Source — Done

- `user_profile.json` exists at the project root.
- Generated from real resume, work history, job search direction, and career goals.
- Valid JSON; safe to read from server-side code in follow-up tasks.
- No source code was changed; no API route was added; `jobs_temp.json` was not modified.

#### TASK-008 Add Analyze Fit Button Placeholder on Detail Page — Done

- Job detail page now shows an **AI Job Fit Analysis** section.
- A disabled **Analyze Fit** button placeholder is visible on each job detail page.
- The button is disabled for now and does not make any network request.
- No analyze API existed yet at the time of this task and no AI analysis logic had been implemented.
- No data files (`jobs_temp.json`, `user_profile.json`) were modified.

#### TASK-009 Add Analyze API Endpoint — Done

- Added `POST /api/jobs/[id]/analyze` at `src/app/api/jobs/[id]/analyze/route.ts`.
- The endpoint reads `jobs_temp.json` and `user_profile.json` and finds the target job by `id`.
- It returns a **structured job-fit analysis JSON** object using deterministic local placeholder / rule-based analysis.
- It returns a 404 JSON response when the job `id` is missing.
- It does **not** modify `jobs_temp.json` or `user_profile.json`; behavior is read-only.
- It does **not** use any external AI APIs and requires no API keys.
- No frontend connection was added yet; the **Analyze Fit** button on the detail page remains disconnected from this API.

_(TASK-010 through TASK-014: UI wiring, local analysis display, and related MVP 0.3 iterations — completed in prior sessions.)_

---

### MVP 0.2 — Application Status Tracking — Done

#### TASK-005 Show Status Badge on Home Page — Done

- Each home page job card displays application status.
- Missing or invalid status displays as `未投遞` (`not_applied`).

#### TASK-006 Add Status Filters on Home Page — Done

- Client-side status filter tabs: 全部, 未投遞, 已投遞, 即將面試, 不適合.
- Clicking a filter shows only jobs in that status.
- Each tab shows a count; missing status counts as `not_applied`.

### TASK-002 Fix Home AI Button — Done

- Home page button navigates to `/jobs/[id]` (`查看詳情 / AI 分析`); no placeholder alert.

### TASK-003 Add Job Status API — Done

- `PATCH /api/jobs/[id]/status` in `src/app/api/jobs/[id]/status/route.ts`
- Status values: `not_applied`, `applied`, `interview`, `not_interested`
- Persists `status` and `statusUpdatedAt` to `jobs_temp.json`

### TASK-004 Add StatusSelect to Detail Page — Done

- `StatusSelect` on the job detail page
- Updates status via the status API; missing status defaults to `not_applied`

---

## Backlog

- Wire `user_profile.json` into job-fit scoring (ongoing / iterative).
- Replace mock AI scoring with profile-aware analysis.
- Search jobs by title and raw text.
- Sort by collected date.
- Sort by AI score.
- Delete confirmation dialog.
- Extract shared job types.
- Extract `jobs_temp.json` read/write helpers.
- Move from JSON to database.
