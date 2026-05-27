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

### TASK-008 — Done

- Job detail page now includes an **AI Job Fit Analysis** section.
- A disabled **Analyze Fit** button placeholder is visible on each job detail page.
- The button is currently disabled and does not call any API.
- No analyze API existed yet at the time of this task and no AI analysis logic had been implemented.
- No data files (`jobs_temp.json`, `user_profile.json`) were modified for this task.

### TASK-009 — Done

- `POST /api/jobs/[id]/analyze` now exists at `src/app/api/jobs/[id]/analyze/route.ts`.
- The endpoint reads `jobs_temp.json` and `user_profile.json`, finds the target job by `id`, and returns a structured job-fit analysis JSON object.
- The analysis is implemented as a deterministic local placeholder / rule-based analysis; no external AI API is called and no API keys are required.
- When the job `id` is missing, the endpoint returns a JSON 404 response.
- The endpoint does **not** modify any data files (`jobs_temp.json`, `user_profile.json`); behavior is read-only.
- No frontend wiring was added yet; the **Analyze Fit** button on the job detail page is still not connected to this API.

### MVP 0.3 Data Preparation — Status

User profile data and a first-pass local analysis API are in place. The next step is to wire the UI button to the new endpoint and render the returned analysis, still without involving any external AI.

## Immediate Next Task

- **TASK-010:** Connect Analyze Fit button to the analyze API and render results.
  - On click, call `POST /api/jobs/[id]/analyze` for the current job `id`.
  - Display the returned structured analysis (scores, strengths, concerns, recommendations, etc.) in a simple, local-state-based UI on the job detail page.
  - Do **not** integrate any external AI yet; continue to rely only on the local placeholder / rule-based analysis implemented in the API.
  - Do **not** modify `jobs_temp.json` or `user_profile.json`; this task must keep data access read-only.
  - Keep the UI small, focused, and client-local (no new global state mechanisms or complex abstractions).

## Do Not Do Yet

- Real AI API integration (until profile data and scoring flow are defined)
- Database migration
- Login
- Cloud sync
- Calendar
- Resume generation
