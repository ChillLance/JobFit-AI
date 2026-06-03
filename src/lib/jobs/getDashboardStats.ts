// Dashboard statistics for the home page (TASK-024).
// Pure, read-only aggregation over the currently loaded jobs. Reuses the
// TASK-023 display-score / risk helpers (which in turn reuse the TASK-022
// model comparison). This NEVER calls any AI API — it only reads stored data.

import { getJobDisplayScore, jobHasRisk } from '@/lib/jobs/getJobDisplayScore'
import type { AnalysisJobInput } from '@/types/analysis'

export type DashboardStats = {
  totalJobs: number
  highMatchJobs: number
  appliedJobs: number
  interviewingJobs: number
  averageScore: number | null
  riskyJobs: number
  unanalyzedJobs: number
  recentJobs: number
}

// Loose job shape the dashboard reads. Combines the analysis fields needed by
// the score / risk helpers with the optional status + date fields. Anything
// missing is simply skipped — never assumed.
export type DashboardJob = AnalysisJobInput & {
  status?: string
  createdAt?: string
  scrapedAt?: string
  savedAt?: string
  updatedAt?: string
  collectedAt?: string
}

const HIGH_MATCH_THRESHOLD = 80
const RECENT_WINDOW_DAYS = 7
const RECENT_WINDOW_MS = RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000

function normalizeStatus(status?: string): string {
  return typeof status === 'string' ? status.trim().toLowerCase() : ''
}

// True for "applied"-like statuses. Tolerant of both the project enum value and
// a Chinese label, without changing the stored data format.
export function isAppliedStatus(status?: string): boolean {
  const s = normalizeStatus(status)
  return s === 'applied' || s === '已投遞'
}

// True for "interviewing"-like statuses. Accepts the project enum (`interview`),
// the gerund form, and the Chinese label.
export function isInterviewingStatus(status?: string): boolean {
  const s = normalizeStatus(status)
  return s === 'interview' || s === 'interviewing' || s === '面試中'
}

// Resolve the single numeric score for a job (0–100) or null when unanalyzed.
// Delegates to the TASK-023 display score so the dashboard, list filters, and
// sorting all agree on the same value.
export function getValidScore(job: DashboardJob): number | null {
  return getJobDisplayScore(job).score
}

// First parseable timestamp (ms) from the most likely date fields, or null when
// none is usable. Invalid / missing dates never throw.
export function getJobDate(job: DashboardJob): number | null {
  const candidates = [
    job.createdAt,
    job.scrapedAt,
    job.savedAt,
    job.updatedAt,
    job.collectedAt,
  ]

  for (const value of candidates) {
    if (typeof value !== 'string' || !value.trim()) continue
    const time = new Date(value).getTime()
    if (Number.isFinite(time)) return time
  }

  return null
}

// Aggregate dashboard stats from the full job list. Intentionally computed over
// ALL jobs (not the filtered view) so it reflects the overall job-search state.
export function getDashboardStats(jobs: DashboardJob[]): DashboardStats {
  const now = Date.now()

  let highMatchJobs = 0
  let appliedJobs = 0
  let interviewingJobs = 0
  let riskyJobs = 0
  let unanalyzedJobs = 0
  let recentJobs = 0

  const scoreValues: number[] = []

  for (const job of jobs) {
    const score = getValidScore(job)
    if (score === null) {
      unanalyzedJobs += 1
    } else {
      scoreValues.push(score)
      if (score >= HIGH_MATCH_THRESHOLD) highMatchJobs += 1
    }

    if (isAppliedStatus(job.status)) appliedJobs += 1
    if (isInterviewingStatus(job.status)) interviewingJobs += 1

    if (jobHasRisk(job)) riskyJobs += 1

    const date = getJobDate(job)
    if (date !== null && now - date <= RECENT_WINDOW_MS && now - date >= 0) {
      recentJobs += 1
    }
  }

  const averageScore =
    scoreValues.length > 0
      ? Math.round(
          scoreValues.reduce((acc, n) => acc + n, 0) / scoreValues.length
        )
      : null

  return {
    totalJobs: jobs.length,
    highMatchJobs,
    appliedJobs,
    interviewingJobs,
    averageScore,
    riskyJobs,
    unanalyzedJobs,
    recentJobs,
  }
}
