/**
 * Batch local rule-based analysis (one-click "analyze all" workflow, TASK-030).
 *
 * Thin wrapper over `analyzeJobLocally` that runs the same profile-driven
 * local analysis over every job in a list. Kept pure (no fs / no network, no
 * storage writes) so it can be unit tested directly and reused from any
 * server route — the caller owns persisting each `{ id, result }` pair (see
 * POST /api/jobs/analyze-local-all).
 */

import { analyzeJobLocally } from './localAnalysis'
import type { LocalAnalyzableJob, LocalAnalysisResult } from './localAnalysis'
import type { JapanCareerProfile } from '@/lib/profile'

export type AnalyzeAllJobsLocallyEntry = {
  id: string
  result: LocalAnalysisResult
}

/**
 * Analyze every job against the active career profile using the same
 * keyword-matching rules as the single-job endpoint. Local analysis is a
 * pure function of (job, profile), so re-running it for all jobs is
 * naturally idempotent — safe to call repeatedly and overwrite prior results.
 */
export function analyzeAllJobsLocally(
  jobs: LocalAnalyzableJob[],
  profile: JapanCareerProfile
): AnalyzeAllJobsLocallyEntry[] {
  return jobs.map((job) => ({
    id: job.id,
    result: analyzeJobLocally(job, profile),
  }))
}
