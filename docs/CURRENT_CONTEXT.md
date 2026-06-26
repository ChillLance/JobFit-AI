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
- Job detail page uses the **Analyze Fit panel** (`AnalyzeFitPanel`) for local /
  Gemini / Groq analysis. The old mock `ScorePanel` + `/api/jobs/[id]/score`
  route were removed in the Phase 1 redesign (see `docs/REDESIGN.md`).
- The UI is fully **multilingual (zh-TW / en / ja)** via `src/lib/uiCopy.ts` +
  `useAppLanguage` — this is active, not deferred.
- All `jobs_temp.json` access goes through `src/lib/jobs/jobsRepository.ts`, and
  every `Job` is the canonical type in `src/types/domain.ts`.

## Current Focus: MVP 0.3 — Portfolio Readiness — TASK-025 Next

The AI input pipeline work (TASK-021 series), **TASK-022: Model Comparison & Final Recommendation**, **TASK-023: Job List Search / Filter / Sort**, and **TASK-024: Dashboard Stats Cards** are **complete** and `tsc --noEmit` passes. The next step is **TASK-025: Portfolio UI Polish with shadcn-style UI**.

### TASK-024 Dashboard Stats Cards — complete

- Home page now shows a responsive row of **dashboard stats cards** above the filter bar / job list, replacing the old「職缺數量 / 資料來源」blocks.
- New pure helper `src/lib/jobs/getDashboardStats.ts` (`getDashboardStats(jobs)` + `DashboardStats`) aggregates **total / high-match (≥80) / applied / interviewing / average score / risky** jobs, plus `unanalyzedJobs` and `recentJobs` (近 7 天) hints. It **makes no AI API calls** — it reuses TASK-023 `getJobDisplayScore` / `jobHasRisk`.
- New presentational component `src/components/jobs/DashboardStatsCards.tsx`. Stats are computed over **all** jobs so they stay stable while filtering; existing search / filter / sort / status update / detail navigation are unchanged.

### TASK-023 Job List Search / Filter / Sort — complete

- Home page job list now supports **client-side search, status / score / risk filtering, and sorting** — no API calls and no AI changes.
- **Search** (case-insensitive, trimmed, CJK-safe) covers title / company / location / employment type / source / url / raw text; shows「顯示 X / Y 個職缺」.
- **Status tabs** (existing 未投遞 / 已投遞 / 面試中 / 不感興趣) were integrated into the new filter bar rather than duplicated.
- **Score filter** (高 ≥80 / 中 60-79 / 低 <60 / 未分析) and **「只看有風險」** read from TASK-022 `buildAnalysisComparison` with a primary-analysis fallback, via new pure helpers `src/lib/jobs/getJobDisplayScore.ts` and `src/lib/jobs/filterJobs.ts`.
- **Sort** by newest / oldest / score / company / title; an **active filters summary**,「清除篩選」button, and a dashed **empty state** were added. Status update and detail navigation are unchanged.

### TASK-022 Model Comparison & Final Recommendation — complete

- Added `src/lib/analysis/compareAnalysis.ts` (`AnalysisComparison` + `buildAnalysisComparison`).
- Consolidates the **already-stored** Local / Gemini / Groq results via `normalizeAnalysisResult` — **no extra AI API calls**.
- Surfaces score comparison, average score, score spread, model consistency, consensus recommendation, common strengths/risks/gaps, and pre-application confirmation items.
- New **「模型比較」** tab in `AnalyzeFitPanel`; existing per-provider tabs untouched.

### AI input pipeline — current state (TASK-021 series complete)

- **Gemini and Groq share** `buildAnalysisInput` / `buildJobFitPrompt` — a single input/prompt path for both providers.
- **`inputMode: digest`** — analysis runs on a compact digest rather than raw job text.
- **`tokenStrategy: relevant_job_digest_v1`** — conservative, relevance-driven digest strategy.
- **`jobDigest` / `evidenceSnippets` / `fallbackImportantText`** are wired into the prompt.
- **`inputCoverage`** is retained for diagnostics — used to detect truncation and tail-section (尾段) risk.
- **Phrase-level boilerplate cleanup** is complete.
- **UI shows digest stats**, including: summary items (摘要項目), removed noise (已移除雜訊), recovered tail-section evidence (補回尾段證據), and fallback line count (fallback 條數).

### Decision

- The **TASK-021 series is complete**. Unless a major bug is found, **do not keep refactoring the input pipeline**.
- The next task is **TASK-022: Model Comparison & Final Recommendation**.

### Completed history — MVP 0.3 milestones (summary)

- **TASK-007:** `user_profile.json` at project root.
- **TASK-008–009:** Analyze Fit UI placeholder and local `POST /api/jobs/[id]/analyze` (read-only rule-based analysis).
- **TASK-010+:** Analyze Fit button wired; local analysis display; persistence and UI iterations through TASK-014.
- **TASK-015 (completed, now historical):** Gemini deep analysis integration via `POST /api/jobs/[id]/analyze/deep` (`AnalyzeFitPanel`), with persisted `deepAnalysis`, hardened JSON parsing, and deep-analysis display priority on the detail page. This is no longer the active focus.
- **TASK-021 series:** Compact Input Builder, Input Coverage Report, Conservative Relevant Job Digest, and Input Digest Polish — all complete.

## Do Not Do Yet

- Do not add more AI providers (不要新增更多 AI provider).
- Do not redo the digest prompt (不要重做 digest prompt).
- Do not raise `MAX_JOB_TEXT_CHARS` (不要提高 `MAX_JOB_TEXT_CHARS`).
- Do not store full raw/cleaned/evidence text into metadata (不要把完整 raw/cleaned/evidence text 存進 metadata).
- Do not build auto-apply / auto-submit features yet (不要先做自動投遞功能).
- Database migration
- Login / authentication
- Cloud sync
- Calendar integration
- Resume / cover letter generation
- Large UI redesign
