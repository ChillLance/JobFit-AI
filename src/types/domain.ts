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
  // Analysis results.
  // NOTE (Phase 1): the existing provider-specific keys are kept as-is so behavior
  // is unchanged. Phase 2 unifies these into `analyses: { local?, gemini?, groq? }`
  // and reconciles the local write key (`analysis`) with the reader. Kept loose
  // (Record) here; consumers normalize via `normalizeAnalysisResult`.
  analysis?: Record<string, unknown> // local rule-based result
  aiScore?: Record<string, unknown> // legacy local / mock score
  deepAnalysis?: Record<string, unknown> // Gemini
  groqAnalysis?: Record<string, unknown> // Groq
}
