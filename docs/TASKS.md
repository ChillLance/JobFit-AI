# JobFit-AI Tasks

## Current Phase: MVP 0.3 — Job Fit Analysis

Focus: move from mock AI scoring toward real job-fit analysis using a local user profile data source.

## Current Task

### TASK-009 Add Analyze API Endpoint

Goal:

- Add a `POST /api/jobs/[id]/analyze` API route that prepares for profile-aware job-fit analysis.
- The endpoint should be small and focused, returning a structured JSON analysis response without overcomplicating the implementation.

Behavior (high level):

- Read the target job from `jobs_temp.json` using the given `id`.
- Read user profile data from `user_profile.json`.
- Generate a **structured job-fit analysis object** (e.g. scores, strengths, gaps, recommendations) and return it as JSON.
- Keep side effects minimal; avoid modifying `jobs_temp.json` or `user_profile.json` unless a later task explicitly allows it.

Notes:

- No real external AI API integration in this task.
- Keep the data shape and implementation small so it remains easy to iterate on in later tasks.

Likely files:

```txt
src/app/api/jobs/[id]/analyze/route.ts
```

---

## Next Tasks

_(To be added after TASK-008 — e.g. wire profile into scoring API, replace mock AI with profile-aware analysis.)_

---

## Completed Tasks

### MVP 0.3 — Job Fit Analysis — In Progress

#### TASK-007 Create user_profile.json Data Source — Done

- `user_profile.json` exists at the project root.
- Generated from real resume, work history, job search direction, and career goals.
- Valid JSON; safe to read from server-side code in follow-up tasks.
- No source code was changed; no API route was added; `jobs_temp.json` was not modified.

#### TASK-008 Add Analyze Fit Button Placeholder on Detail Page — Done

- Job detail page now shows an **AI Job Fit Analysis** section.
- A disabled **Analyze Fit** button placeholder is visible on each job detail page.
- The button is disabled for now and does not make any network request.
- No analyze API exists yet and no AI analysis logic has been implemented.
- No data files (`jobs_temp.json`, `user_profile.json`) were modified.

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

- Wire `user_profile.json` into job-fit scoring.
- Replace mock AI scoring with profile-aware analysis.
- Search jobs by title and raw text.
- Sort by collected date.
- Sort by AI score.
- Delete confirmation dialog.
- Extract shared job types.
- Extract `jobs_temp.json` read/write helpers.
- Add real AI API integration.
- Move from JSON to database.
