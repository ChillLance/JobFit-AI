# JobFit-AI Current Context

## Current Status

JobFit-AI is a local Next.js-based job tracking and AI job-fit analysis tool.

Completed:

- Chrome Extension can collect job postings.
- Collected jobs are saved into `jobs_temp.json`.
- Home page displays collected jobs and AI score/level.
- Home page action links to `/jobs/[id]` (`查看詳情 / AI 分析`).
- Job detail page at `/jobs/[id]` with AI score panel (`ScorePanel`) and application status selector (`StatusSelect`).
- Mock AI scoring API; scores persist to `jobs_temp.json`.
- `PATCH /api/jobs/[id]/status` persists application status (`not_applied`, `applied`, `interview`, `not_interested`).
- Missing status defaults to `not_applied` in the UI.

## Immediate Next Task

- **TASK-005:** Show status badge on each home page job card.
- **TASK-006:** Add status filter tabs/grouping on the home page (with counts).

## Do Not Do Yet

- Real AI API integration
- Database migration
- Login
- Cloud sync
- Calendar
- Resume generation
