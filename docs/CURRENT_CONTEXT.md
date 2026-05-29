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

## Current Focus: MVP 0.3 — AI Analysis Hub — TASK-022 Next

The AI input pipeline work (TASK-021 series) is **complete** and `tsc --noEmit` passes. The next step is **not** to keep changing the input pipeline, but to build **TASK-022: Model Comparison & Final Recommendation**.

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
