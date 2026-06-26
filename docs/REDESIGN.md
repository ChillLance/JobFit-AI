# JobFit-AI — Architecture Redesign

> Status: **Active direction** (agreed 2026-06-26). This document supersedes the
> "keep it a flat MVP" guidance in `AGENTS.md` / `CLAUDE.md` **only** because the
> original developer explicitly asked to re-orient the project. The working method
> stays conservative: design-first, then small, safe, incremental, verifiable changes.

## 1. Why redesign

The MVP is **feature-complete** (collection, dashboard, status tracking, multiple
profiles, external AI profile import, local + Gemini + Groq analysis, model
comparison). The problem is not features — it is that the codebase has **no
boundaries**. Logic, data shapes, and storage are duplicated across files, so every
new feature multiplies defensive code.

This is a **refactor / re-architecture, not a rewrite.** The domain value
(`profile` schema, `normalizeAnalysisResult`, the digest pipeline) is good and is
preserved. We add the missing seams around it.

## 2. First-principles diagnosis

### Debt 1 — No single canonical `Job` type (fragmented data model)

`Job` / `JobData` is redefined independently in at least three places:

- `src/app/api/jobs/route.ts`
- `src/app/api/jobs/[id]/analyze/route.ts`
- `src/app/jobs/[id]/JobDetailUi.tsx`

Analysis results are stored under **five** different keys —
`deepAnalysis` (Gemini), `groqAnalysis` (Groq), `localAnalysis` / `analysis`
(local), and legacy `aiScore`. The local analyze route writes `job.analysis`, but
`getPrimaryAnalysis` reads `job.localAnalysis` — the names do not match and the code
papers over it by passing props manually from `page.tsx`. Dates are read by probing
five possible keys (`createdAt` / `scrapedAt` / `savedAt` / `updatedAt` /
`collectedAt`). **This naming chaos is the root cause of all the defensive code.**

### Debt 2 — No data-access layer (storage logic scattered)

Each route re-implements raw `fs` read/write of `jobs_temp.json` (`getJobs` in
`jobs/route.ts`, `readJsonFile` / `writeJsonFile` in `analyze/route.ts`, etc.).
Jobs live in a file (server) while profiles live in `localStorage` (browser), so the
two halves of the "decision context" cannot see each other. That forces the analyze
API to receive the active profile in the **request body** as a workaround — the
profile is described as the source of truth yet is stored in the most fragile place.

### Debt 3 — Analysis surface too large for its value

Three providers × four routes + digest builder + coverage diagnostics + comparison.
The core (`normalizeAnalysisResult`, the digest) is solid, but provider logic is
hard-wired into each route, so adding/removing a provider or changing a model touches
many files.

### Zombies / drift

- `POST /api/jobs/[id]/score` (mock quick score) is unused by the UI but still ships.
- The untracked i18n files (`uiCopy.ts`, `useAppLanguage.ts`, `appLanguage.ts`,
  `JobDetailUi.tsx`, `AppLanguageSelector.tsx`) are a **near-complete zh-TW / en / ja
  V2 UI**, but the docs still list "full multilingual UI" as deferred.

> Note: an earlier draft listed `gemini-3.5-flash` as "not a real model id". The
> original developer confirmed it works against their Gemini API, so no model
> string is changed.

## 3. Target architecture

```
 UI (client components)  ── uiCopy i18n
        │  fetch
        ▼
 API routes (thin: validate + delegate, no business logic)
        │
        ▼
 Domain services  (analysis orchestration, profile context)
        │
        ▼
 Repository interface  (getJobs / getJob / saveJob / patchJob / deleteJob / getProfile …)
        │
        ├── Phase 1 adapter: jobs_temp.json (fs)
        ├── Phase 2 adapter: SQLite (Drizzle/Prisma)
        └── Phase 3 adapter: Postgres / Supabase
```

**Single source of truth for types:** one canonical `Job` and `Analysis` in
`src/types/domain.ts`. Every route, page, and helper imports from there — no local
re-declarations.

**Storage stays behind the Repository interface.** Swapping JSON → SQLite → Postgres
becomes a one-module change instead of an edit to every route.

## 4. Decisions

| Question | Decision | Rationale |
| --- | --- | --- |
| Depth | **Refactor & re-architect, preserve all features** | Domain logic is good; the debt is missing seams. A rewrite would discard working value and breaks "smooth for my own use first". |
| Storage | **Introduce a Repository layer now; Phase 1 keeps JSON** | Stops the scattered-`fs` bleeding immediately; makes the DB migration cheap later. |
| Providers | Keep Local + Gemini + Groq, but move provider logic behind a small adapter | Consolidate surface without losing the multi-model comparison value. |

## 5. Phased roadmap

The three goals are one path at different stages.

### Phase 1 — Smooth for personal use (foundation + consolidation) — ✅ done

1. ✅ Extract a single `Job` domain type (`src/types/domain.ts`); replace all local
   `Job` / `JobData` re-declarations.
2. ✅ Reconcile the analysis write/read key mismatch on **flat per-provider keys**
   (`localAnalysis` / `deepAnalysis` / `groqAnalysis`), not a nested `analyses {}`
   object. The local write key moved `analysis` → `localAnalysis`; readers fall
   back to `analysis` / `aiScore` so old records keep working. The nested grouping
   is deferred to Phase 2 (SQLite schema). **Decision: avoid migrating live
   `jobs_temp.json` data and rewriting cache logic in Phase 1.**
3. ✅ Extract `jobsRepository` (JSON implementation) to replace raw `fs` in every route.
4. ✅ Remove the `/score` zombie route (and its dead `ScorePanel`). No model id change.
5. ✅ Commit and integrate the untracked i18n V2; update `docs/` to match reality.

### Phase 2 — Open-source ready (polish + trust)

6. shadcn-style UI polish (the existing TASK-025), using the installed `shadcn-ui` skill.
7. Swap the Repository to SQLite; move profiles into the store so analysis no longer
   depends on the request body.
8. Tests (Vitest) + CI (GitHub Actions) + README / `.env.example` alignment.

### Phase 3 — Basic digital product

9. Postgres / Supabase adapter + multi-user + auth.
10. Provider abstraction as a configurable plugin; selectable models.

## 6. Migration safety principles

- One concern per change; keep `npx tsc --noEmit` green at every step.
- Preserve existing behavior unless a step explicitly changes it.
- Keep `jobs_temp.json` as the Phase 1 store; never delete user data during migration.
- Server-only files (anything using `fs` / `path`) stay server-side — never converted
  to Client Components.
