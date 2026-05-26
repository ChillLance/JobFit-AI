# JobFit-AI Tasks

## Current Task

### TASK-002 Fix Home AI Button

Goal:

- Remove the old placeholder AI scoring alert.
- Replace the home page "AI 評分" button with a link to `/jobs/[id]`.
- Rename the button to `查看詳情 / AI 分析`.

Likely files:

```txt
src/app/page.tsx
```

Acceptance Criteria:

- Clicking the button no longer shows an alert.
- Clicking the button navigates to the job detail page.
- Home page still displays AI score if `aiScore` exists.
- Unscored jobs still show `待分析`.

Do Not Do:

- Do not implement real AI API.
- Do not change storage.
- Do not add status management in this task.
- Do not refactor the whole page.

---

## Next Tasks

### TASK-003 Add Job Status API

Goal:

- Add `PATCH /api/jobs/[id]/status`.
- Support:
  - `not_applied`
  - `applied`
  - `interview`
  - `not_interested`
- Persist `status` and `statusUpdatedAt` to `jobs_temp.json`.

Likely files:

```txt
src/app/api/jobs/[id]/status/route.ts
```

Acceptance Criteria:

- Valid status is written to `jobs_temp.json`.
- Invalid status returns 400.
- Missing job id returns 404.

---

### TASK-004 Add StatusSelect to Detail Page

Goal:

- Add a dropdown to the job detail page.
- Allow the user to update application status.
- Save through the status API.

Likely files:

```txt
src/app/jobs/[id]/StatusSelect.tsx
src/app/jobs/[id]/page.tsx
```

Acceptance Criteria:

- User can change status from detail page.
- Status is persisted to `jobs_temp.json`.
- Page defaults missing status to `not_applied`.

---

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
