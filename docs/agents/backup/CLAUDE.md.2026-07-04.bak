@AGENTS.md
# CLAUDE.md - JobFit-AI

> Keep this file short and sharp. For each line ask: "would removing it cause a
> mistake?" If not, delete it. Detailed rules live in @AGENTS.md — don't duplicate.

## What this is

A local app for collecting job postings and showing AI job-fit analysis.
Storage is SQLite (`data/jobfit.sqlite`), accessed only through
`src/lib/jobs/jobsRepository.ts` / `src/lib/profile/profileRepository.ts`.
`jobs_temp.json` is a legacy, read-only migration source — see docs/REDESIGN.md.
Refactor, don't rewrite. Keep it lightweight.

## Commands

```bash
npm run dev     # start dev server (http://localhost:3000)
npm run build   # production build
npm run lint    # eslint
npm test        # vitest
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

- Never add `'use client'` to files using `fs` / `path` / `node:sqlite` — they must stay server-side.
- Don't delete `jobs_temp.json` (historical snapshot); don't add a second storage backend.
- No auth or cloud sync unless explicitly requested. AI providers (Gemini/Groq/
  OpenRouter) and SQLite are already in place — don't add *new* ones casually.
- Don't change dependency versions or add deps without being asked.

## Next tasks

See `docs/REDESIGN.md` for the phased roadmap (Phase 1 + Phase 2 complete).
Phase 3 (Postgres/Supabase, multi-user, auth) is not started.
