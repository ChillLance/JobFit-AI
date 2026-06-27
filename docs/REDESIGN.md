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

## 7. Direction update (2026-06-27) — from "job tracker" to "job-hunt pipeline"

Context: the original developer is on a **working-holiday visa in Japan**, targeting
two distinct segments:

- **(A) Tech / fully-remote roles** that fit their conditions, and
- **(B) 住み込み (live-in) リゾートバイト** — resort/hospitality work where 寮
  (dorm) and 食事 (meals) are provided. This is the working-holiday bread-and-butter
  and is a *different* segment with different sources and different match criteria.

The future goal expands the app from "collect + analyze jobs I paste in" to
"**automatically ingest jobs, match them against my profile, help me tailor + apply,
and prep for interviews**". Reframed around that goal:

### 7.1 The decisive blocker for automation

Debt 2 (profile in `localStorage`, jobs in the server file) is no longer just tech
debt — it is the **wall that blocks automation**. A background ingestion job runs on
the server and **cannot read a profile that lives in the browser**. Closing this
(move the profile to the server, behind the Repository) is the prerequisite for any
automated matching. This promotes §5 Phase 2 item 7 to a near-term **Phase 1.5**.

### 7.2 Two ingestion classes (not the same problem)

| Class | Sources | Access | Legality / stability |
| --- | --- | --- | --- |
| **A. Tech / remote (EN-friendly)** | Greenhouse / Lever / Ashby public job-board APIs; aggregators (RemoteOK, Remotive, We Work Remotely); TokyoDev / Japan Dev (many of whose companies *use* those ATS) | **Public JSON APIs** — no scraping | ✅ Legal, stable. The green-light path. |
| **B. 住み込み / リゾートバイト** | JP dispatch agencies: リゾバ.com, アルファリゾート, リゾートバイトダイブ, グッドマンサービス, ワクトリ, はたらくどっとこむ … | **No public API**, Japanese-only, form/login-gated | ⚠️ Scraping-bound, ToS-sensitive, fragile (same shape as the 104/Cake problem). |
| **C. Social / "hidden" job market** | Hiring posts on X, LinkedIn posts, Reddit (r/remotejobs, HN "Who is hiring"), Discord / Slack, FB groups, LINE Openchat | **Human-captured** (Chrome extension / Claude for Chrome) → **LLM-normalized** into the store | ✅ No scraping if user-initiated capture. High-signal, low-competition, but unstructured & ephemeral — exactly where structured-API tools are blind and LLMs shine. The existing Chrome extension is the ready-made capture tool for this. |

Implication: **do not build Class B as an unattended crawler.** For Class B the
realistic path is **manual / semi-manual capture** (the existing Chrome-extension
collect flow, or paste-in) + AI matching — keep a human in the loop and stay off the
agencies' anti-bot radar. **Class A is where automated ingestion earns its keep.**

### 7.3 Profile schema implication — add a "work style" axis

`JapanCareerProfile` already models `visa` and `languages` (good — it anticipated
Japan). But the two segments need different match criteria:

- **Tech / remote:** role, stack, seniority, remote-OK, salary, EN/JP level.
- **住み込みリゾートバイト:** 寮あり / 食事付き (dorm + meals), 勤務地
  (北海道・沖縄・温泉地 …), 期間 (短期/長期), 職種 (仲居・裏方・フロント・リフト係 …),
  時給, 目標貯金額 (savings target).

Because the store already supports **multiple profiles**, the clean model is **one
profile per search mode**, each with its own `conditions` block, distinguished by a
`workStyle: 'remote-tech' | 'resort-baito'` discriminator — *not* one profile trying
to be both.

### 7.4 The MCP question, resolved

Do **not** replace the app with community MCP/skills. Keep the app as the
system-of-record + ingestion backbone, use the LLM as the brain, and — at Phase 3 —
**expose this app itself as an MCP server** so the job store can be queried
conversationally ("which jobs fit me best? tailor my résumé for #3"). The convergence
point is "**my app becomes a skill**", not "borrow someone's crawler".

### 7.5 Landmines — do not build

- LinkedIn contact scraping + automated outreach / DMs → ToS + ban.
- Automated apply / form auto-submit on any platform → ban + spray-and-pray quality damage.
- Class B as an unattended scraper of dispatch agencies → fragile + ToS.

## 8. Updated phased roadmap (supersedes §5 sequencing where they conflict)

- **Phase 0 — Zero-code validation (now):** Claude Project + résumé + ATS MCP + paste
  JDs from TokyoDev / Japan Dev (Class A) and dispatch-agency listings (Class B).
  Confirm AI matching + résumé tailoring is worth it *before* investing more code.
- **Phase 1 — ✅ done** (foundation / consolidation).
- **Phase 1.5 — Bridge (unlocks automation):** (a) move profile to the server behind
  the Repository (closes §7.1); (b) add a `JobSource` ingestion interface, first
  adapter = Greenhouse / Lever / Ashby public boards filtered to remote + Japan;
  auto-collect → auto-run local analysis.
- **Phase 2 — Open-source ready:** SQLite via Repository; profiles fully in the store;
  Vitest + CI; shadcn polish; more Class-A adapters (RemoteOK, Remotive, Adzuna,
  TokyoDev / Japan Dev feeds); `workStyle` axis on the profile (§7.3).
- **Phase 3 — Product + MCP:** Postgres / Supabase; expose the app as an MCP server;
  human-in-the-loop tailor-and-apply (draft → review → send; email semi-auto for small
  companies, platform apply stays manual); interview-prep module.
- **Never:** the §7.5 landmines.

## 9. Distribution, network & sanctioned tooling (2026-06-27)

### 9.1 Inverse market — "post yourself", not just collect jobs

Candidates also get hired by **posting their own availability**: HN "Ask HN: Who
wants to be hired?", LinkedIn `#OpenToWork`, Wantedly (カジュアル面談 — companies
reach out to your profile). This is the mirror image of Class C. **Product symmetry:**
generate an optimized "hire me" one-pager / availability post from the active
profile, and track *where it was posted + who responded*. Inbound interest is a
stronger demand signal than outbound applies.

### 9.2 The flywheel — job hunt × side project are one loop

Building this tool **in public**, in the communities where foreign devs in Japan
gather (TokyoDev, r/japanlife, **connpass** meetups), is itself the highest-ROI
job-search network: people see "this person built something useful", not a résumé.
The project doubles as **portfolio + lead-gen**. Referrals / network beat application
volume — so the product should **amplify network & visibility, not automate
spray-and-pray applies** (that segment's reputation is collapsing: LazyApply / Sonara
widely panned, "buggy / black box / wrong résumé"). For リゾートバイト, the dispatch
agencies' コーディネーター act as a free matching network — register, don't only search.

### 9.3 Sanctioned official tooling (verified 2026-06-27) — prefer over fragile 3rd-party MCPs

- **Indeed Connector** (`claude.com/connectors/indeed`) — Indeed's *own* official MCP
  server, listed in Claude's connector directory. API-based job search + job detail +
  company reviews/salary + résumé retrieval. **Safe (no scraping, no ban risk).**
  Indeed Japan (`jp.indeed.com`) has deep coverage incl. アルバイト, so this is a legal
  channel into part of **Class A *and* Japan listings**. Use for discovery; do not rebuild it.
- **Claude for Chrome** (official, beta on paid plans) — browser navigate + form-fill +
  scheduled background tasks, with human confirmation on sensitive actions. The
  *official* **human-in-the-loop** capture/assist tool: the right way to handle LinkedIn
  (read + draft, you click submit) and to capture **Class C** social postings. Note: it
  partly **commoditizes the project's custom Chrome extension** — don't over-invest there
  if the official one suffices.
- ⚠️ Overstated elsewhere: a Claude Code "job-hunting plugin" (arustydev) is
  **community**, not "officially certified" — vet before trusting. LinkedIn has **no**
  official connector (correct); never use third-party auto-apply on it.

**Strategic implication:** official tools now cover much of Class A discovery + safe
LinkedIn assist for free. The app's durable value is therefore the **system-of-record**
(tracking + A–F grading against the visa / language / 住み込み profile) and the **white
space** (Class B resort dispatch + Class C social normalization) — *not* re-building the
discovery the connectors already do.
