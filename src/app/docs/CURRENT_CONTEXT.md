# JobFit-AI Current Context

## Current Status

JobFit-AI is a local Next.js-based job tracking and AI job-fit analysis tool.

Completed:

- Chrome Extension can collect job postings.
- Collected jobs are saved into `jobs_temp.json`.
- Home page displays collected jobs.
- Job detail page exists at `/jobs/[id]`.
- Mock AI scoring API works.
- AI score is persisted back into `jobs_temp.json`.
- Detail page can load existing AI score.
- Home page displays AI score and level.

## Current Known Issue

The home page still has an old "AI 評分" button.

When clicked, it shows an alert:

```txt
AI 評分功能待開發
```

This is outdated because AI scoring is already available on the detail page through `ScorePanel`.

## Immediate Next Task

Fix the home page AI button:

- Remove the old placeholder alert.
- Replace the button with a link to `/jobs/[id]`.
- Rename it to `查看詳情 / AI 分析`.
- Ensure home page AI score display remains working.

## Next Feature After That

Add application status management:

- `not_applied`
- `applied`
- `interview`
- `not_interested`

Planned flow:

```txt
PATCH /api/jobs/[id]/status
→ write status into jobs_temp.json
→ detail page StatusSelect
→ home page status badge
→ home page status filters
```

## Do Not Do Yet

- Real AI API integration
- Database migration
- Login
- Cloud sync
- Calendar
- Resume generation
