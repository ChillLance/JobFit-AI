<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# JobFit-AI Agent Rules

## Project Overview

JobFit-AI is a local Next.js App Router project for collecting job postings, storing them locally, and showing AI-based job-fit analysis.

The app is currently an MVP.

Current storage is file-based:

```txt
jobs_temp.json
```

This file is located in the project root and is currently the source of truth.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Local JSON file storage
- Chrome Extension sends collected jobs to the app
- Mock AI scoring API

## Current Core Flow

```txt
Chrome Extension collects job posting
→ POST to local Next.js API
→ Save job to jobs_temp.json
→ Home page displays jobs
→ Detail page displays one job
→ Mock AI score API generates score
→ AI score is saved back to jobs_temp.json
→ Home page displays AI score
```

## Important Files

```txt
jobs_temp.json
src/app/page.tsx
src/app/api/collect/route.ts
src/app/api/jobs/[id]/route.ts
src/app/api/jobs/[id]/score/route.ts
src/app/jobs/[id]/page.tsx
src/app/jobs/[id]/ScorePanel.tsx
```

## Rules for AI Agents

- Do not rewrite the whole project.
- Do not introduce a database unless explicitly requested.
- Do not remove or replace `jobs_temp.json`.
- Do not connect a real AI API unless explicitly requested.
- Do not add unnecessary dependencies.
- Do not change package versions unless explicitly requested.
- Do not modify unrelated files.
- If a task requires changing more than 3 files, explain the plan first.
- Preserve existing working behavior unless the task explicitly says to change it.

## Next.js Rules

- This project uses Next.js App Router.
- Files that use Node.js APIs such as `fs` and `path` must stay server-side.
- Do not add `'use client'` to files that read or write `jobs_temp.json`.
- Use Client Components only for interactive UI such as buttons, filters, forms, and dropdowns.

## Current Priorities

1. Fix the old home page AI button that still shows an alert.
2. Add job application status API.
3. Add status selector on the detail page.
4. Show status badge on the home page.
5. Add status filter tabs on the home page.

## Do Not Do Yet

- Real AI API integration
- Database migration
- User login
- Cloud sync
- Calendar integration
- Resume generation
- Cover letter generation
- Large UI redesign

<!-- END:nextjs-agent-rules -->


