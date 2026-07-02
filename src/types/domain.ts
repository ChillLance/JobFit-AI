/**
 * Canonical domain types for JobFit-AI (redesign Phase 1).
 *
 * Single source of truth: every route / page / helper imports `Job` from here
 * instead of re-declaring its own shape. See docs/REDESIGN.md.
 */

export const JOB_STATUSES = [
  'not_applied',
  'applied',
  'interview',
  'not_interested',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  collectedAt?: string
  // Structured fields — only present for some sources; otherwise the data lives
  // inside rawText and is rendered only when available.
  company?: string
  location?: string
  employmentType?: string
  salary?: string
  description?: string
  // Application tracking.
  status?: JobStatus
  statusUpdatedAt?: string
  // Analysis results. Kept as flat per-provider keys (Phase 1 decision in
  // docs/REDESIGN.md); consumers normalize via `normalizeAnalysisResult`. The
  // nested `analyses: { local?, gemini?, groq? }` grouping is deferred to Phase 2
  // when the SQLite schema is defined.
  localAnalysis?: Record<string, unknown> // local rule-based result (canonical key)
  deepAnalysis?: Record<string, unknown> // Gemini
  groqAnalysis?: Record<string, unknown> // Groq
  openrouterAnalysis?: Record<string, unknown> // OpenRouter (any model via gateway)
  // Deprecated, read-only back-compat: older records may still carry these. New
  // code never writes them. `analysis` was the previous local key; `aiScore` was
  // the legacy mock score. Readers fall back to them so old data is not lost.
  analysis?: Record<string, unknown>
  aiScore?: Record<string, unknown>
}
