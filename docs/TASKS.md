# JobFit-AI Tasks

## Current Task

### TASK-005 Show Status Badge on Home Page

Goal:

- Show each job's application status on the home page.
- Missing status should display as `未投遞`.

Likely files:

```txt
src/app/page.tsx
```

Acceptance Criteria:

- Each card displays status.
- Status labels are shown in Chinese.

---

## Next Tasks

### TASK-006 Add Status Filters on Home Page

Goal:

Add home page filters:

```txt
全部
未投遞
已投遞
即將面試
不適合
```

Acceptance Criteria:

- Clicking a filter only shows jobs in that status.
- Counts are shown for each filter.
- Missing status counts as `not_applied`.

---

## Completed Tasks

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

- Search jobs by title and raw text.
- Sort by collected date.
- Sort by AI score.
- Delete confirmation dialog.
- Extract shared job types.
- Extract `jobs_temp.json` read/write helpers.
- Add real AI API integration.
- Add user profile / resume data.
- Move from JSON to database.
