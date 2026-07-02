<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# JobFit-AI Agent Rules

## Project Overview

JobFit-AI is a local Next.js App Router project for collecting job postings, storing them locally, and showing AI-based job-fit analysis.

The app has gone through a redesign (see docs/REDESIGN.md) and is now past MVP:
Phase 1 (consolidation) and Phase 2 (SQLite + tests/CI) are complete.

Storage is SQLite (redesign Phase 2), accessed only through
`src/lib/jobs/jobsRepository.ts` and `src/lib/profile/profileRepository.ts`:

```txt
data/jobfit.sqlite
```

`jobs_temp.json` is a **legacy, read-only migration source**: on first boot,
if `data/jobfit.sqlite` has no jobs yet, it is imported once from
`jobs_temp.json` and the JSON file is left untouched on disk afterward. No
route or page reads/writes it directly anymore.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- SQLite via Node's built-in `node:sqlite` (no native/compiled dependency)
- Vitest for unit tests, GitHub Actions for CI
- Chrome Extension (`extension/`) sends collected jobs to the app
- Local rule-based analysis + Gemini / Groq / OpenRouter providers

## Current Core Flow

```txt
Chrome Extension collects job posting
→ POST /api/collect
→ jobsRepository.prependJob() persists to SQLite
→ Home page lists jobs, detail page shows one job
→ Analyze Fit panel runs local / Gemini / Groq / OpenRouter analysis
→ Result persisted back onto the job row via jobsRepository.updateJob()
```

## Important Files

```txt
src/lib/jobs/db.ts                  # shared SQLite connection + legacy migration
src/lib/jobs/jobsRepository.ts      # the ONLY module that touches the jobs table
src/lib/profile/profileRepository.ts# server-side mirror of the active profile
src/types/domain.ts                 # canonical Job / JobStatus types
src/app/page.tsx
src/app/api/collect/route.ts
src/app/api/jobs/[id]/route.ts
src/app/jobs/[id]/page.tsx
```

## Rules for AI Agents

- Do not rewrite the whole project.
- Do not add a second storage backend without discussing it first — SQLite via
  `jobsRepository.ts` is the one source of truth.
- Do not delete `jobs_temp.json` — it is a historical snapshot.
- Do not connect a real AI API unless explicitly requested (Gemini/Groq/
  OpenRouter are already wired and opt-in via API keys — this means don't add
  *new* providers or auto-calling behavior, not that these are forbidden).
- Do not add unnecessary dependencies.
- Do not change package versions unless explicitly requested.
- Do not modify unrelated files.
- If a task requires changing more than 3 files, explain the plan first.
- Preserve existing working behavior unless the task explicitly says to change it.

## Next.js Rules

- This project uses Next.js App Router.
- Files that use Node.js APIs such as `fs`, `path`, or `node:sqlite` must stay
  server-side.
- Do not add `'use client'` to files that import `jobsRepository` or
  `profileRepository`.
- Use Client Components only for interactive UI such as buttons, filters, forms, and dropdowns.

## Do Not Do Yet

- Postgres/Supabase migration (Phase 3)
- User login / multi-user
- Cloud sync
- Calendar integration
- Resume generation
- Cover letter generation

<!-- END:nextjs-agent-rules -->


