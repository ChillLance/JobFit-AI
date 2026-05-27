# JobFit-AI Tasks

## Current Phase: MVP 0.3 — Job Fit Analysis

Focus: move from mock AI scoring toward real job-fit analysis using a local user profile data source.

## Current Task

### TASK-007 Create user_profile.json Data Source

Goal:

- Add a local `user_profile.json` file in the project root as the data source for user background, skills, and preferences.
- Define a clear schema so future scoring logic can read consistent profile data.

Likely files:

```txt
user_profile.json
```

Acceptance Criteria:

- `user_profile.json` exists at the project root with a documented shape (e.g. summary, skills, experience, preferences).
- File is valid JSON and safe to read from server-side code in a follow-up task.
- No changes to `jobs_temp.json` or scoring APIs in this task unless explicitly scoped later.

---

## Next Tasks

_(To be added after TASK-007 — e.g. wire profile into scoring, replace mock AI with profile-aware analysis.)_

---

## Completed Tasks

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
