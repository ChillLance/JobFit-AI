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

The current phase targets **true AI job-fit analysis** (profile-aware scoring), not more status UI.

### TASK-007 — Done

- `user_profile.json` now exists at the project root.
- It was generated from the user's real resume, work history, job search direction, and career goals.
- This is the first user profile data source for future job-fit analysis.
- No source code was changed; `jobs_temp.json` was not modified.

### MVP 0.3 Data Preparation — Started

User profile data is in place. Next step is UI scaffolding before wiring analysis logic.

## Immediate Next Task

- **TASK-008:** Add an "Analyze Fit" button placeholder on the job detail page.
  - Button should be visible but does not need to trigger real analysis.
  - Do not implement AI analysis in this task.
  - Do not add an analyze API route.
  - Do not modify `jobs_temp.json`.

## Do Not Do Yet

- Real AI API integration (until profile data and scoring flow are defined)
- Database migration
- Login
- Cloud sync
- Calendar
- Resume generation
