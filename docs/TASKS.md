# JobFit-AI Tasks

## Current Phase: MVP 0.3 — Job Fit Analysis

Focus: move from mock AI scoring toward real job-fit analysis using a local user profile data source.

## Current Task

### TASK-010 Connect Analyze Button to Analyze API

Goal:

- Wire the existing **Analyze Fit** button on the job detail page to the new `POST /api/jobs/[id]/analyze` API.
- Display the returned **structured job-fit analysis JSON** in the existing AI Job Fit Analysis section.

Behavior (high level):

- On click, call `POST /api/jobs/[id]/analyze` for the current job `id`.
- Render the analysis result (scores, strengths, concerns, recommendations, etc.) in a simple, local-state-based UI on the job detail page.
- Handle loading and error states locally in the client component.

Constraints:

- Do **not** integrate any external AI APIs yet; only use the existing local placeholder / rule-based analysis.
- Do **not** modify `jobs_temp.json` or `user_profile.json`; this task is read-only with respect to data files.
- Keep the UI implementation simple, focused, and local-state based (no global state or new complex abstractions).

Likely files:

```txt
src/app/jobs/[id]/page.tsx
```

---

## Next Tasks

_(To be expanded after TASK-010 — e.g. iterate on analysis UI/UX, introduce more profile-aware rules, or prepare for optional external AI integration.)_

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
