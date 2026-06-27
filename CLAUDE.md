@AGENTS.md
# CLAUDE.md - JobFit-AI

> Keep this file short and sharp. For each line ask: "would removing it cause a
> mistake?" If not, delete it. Detailed rules live in @AGENTS.md — don't duplicate.

## What this is

A local MVP for collecting job postings and showing AI job-fit analysis.
Storage is file-based (`jobs_temp.json`) and read/written from the server side.
Refactor, don't rewrite. Keep it lightweight.

## Commands

```bash
npm run dev     # start dev server (http://localhost:3000)
npm run build   # production build
npm run lint    # eslint
git status
```

## Task workflow

1. Read `docs/CURRENT_CONTEXT.md` and `docs/TASKS.md`.
2. Implement only the current task — not future ones.
3. Don't touch unrelated files. If >3 files must change, explain the plan first.
4. After changes, summarize touched files + how to test.

To verify UI behavior (e.g. home/detail pages), use the **webapp-testing** skill:
run `npm run dev` on port 3000 and drive it with Playwright.

## Hard rules (don't break)

- Never add `'use client'` to files using `fs` / `path` — they must stay server-side.
- Don't remove or replace `jobs_temp.json`.
- No real AI API, database, auth, or cloud sync unless explicitly requested.
- Don't change dependency versions or add deps without being asked.

## Next tasks

1. Replace the old home "AI 評分" button (`alert('AI 評分功能待開發')`) with
   navigation to the detail page.
2. Add job application status model.
3. `PATCH /api/jobs/[id]/status`.
4. Status dropdown on the detail page.
5. Status badge + filter tabs on the home page.
