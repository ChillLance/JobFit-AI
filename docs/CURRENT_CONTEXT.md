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

## Next Focus: MVP 0.3 — Job Fit Analysis

The next phase targets **true AI job-fit analysis** (profile-aware scoring), not more status UI.

Immediate work starts with a local user profile data source before changing scoring logic.

## Immediate Next Task

- **TASK-007:** Create `user_profile.json` at the project root as the user background / skills / preferences data source for upcoming job-fit analysis.

## Do Not Do Yet

- Real AI API integration (until profile data and scoring flow are defined)
- Database migration
- Login
- Cloud sync
- Calendar
- Resume generation
