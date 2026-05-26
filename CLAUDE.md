@AGENTS.md
# CLAUDE.md - JobFit-AI

## Purpose

This file provides project context for AI coding assistants.

JobFit-AI is a local job tracking and AI job-fit analysis tool.

It is currently a local MVP and should stay lightweight.

## Current Status

Completed:

- Chrome Extension can collect job postings.
- Jobs are saved into `jobs_temp.json`.
- Home page displays collected jobs.
- Job detail page exists at `/jobs/[id]`.
- Mock AI scoring API works.
- AI scoring result is written back to `jobs_temp.json`.
- Detail page can load existing AI score.
- Home page displays AI score and level.

Known issue:

- Home page still has an old "AI 評分" button that triggers:
  `alert('AI 評分功能待開發')`
- This button should be replaced with navigation to the detail page.

## Development Philosophy

Keep the MVP simple.

Prefer small, safe, incremental changes.

Avoid premature architecture changes such as:

- database migration
- authentication
- cloud sync
- real AI API integration
- complex state management
- major UI rewrite

## Recommended Task Style

When executing a task:

1. Read `docs/CURRENT_CONTEXT.md`.
2. Read `docs/TASKS.md`.
3. Only implement the current task.
4. Do not implement future tasks.
5. Do not change unrelated files.
6. If more than 3 files must be changed, explain the plan first.
7. After implementation, summarize changed files and testing steps.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
git status
```

## Important Warning

Do not convert server-side files that use `fs` or `path` into Client Components.

This project currently relies on reading and writing `jobs_temp.json` from the server side.

## Current Next Tasks

1. Fix home AI button.
2. Add job status model.
3. Add `PATCH /api/jobs/[id]/status`.
4. Add status dropdown to detail page.
5. Add status badge and filters to home page.
