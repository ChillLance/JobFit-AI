// Display-score + risk helpers for the job list (TASK-023).
// Pure, read-only. Resolves the single score / risk signal the home page list
// should show, reusing the TASK-022 model comparison and the shared analysis
// normalizer. This NEVER calls any AI API — it only reads stored results.

import { buildAnalysisComparison } from '@/lib/analysis/compareAnalysis'
import { getPrimaryAnalysis } from '@/lib/analysis/normalizeAnalysis'
import type { AnalysisJobInput } from '@/types/analysis'

export type JobDisplayScore = {
  score: number | null
  source: 'comparison' | 'primary' | 'none'
}

// Resolve the score the list should use for filtering / sorting.
// Priority:
//   1. TASK-022 buildAnalysisComparison(job).averageScore
//   2. fallback to the primary analysis fitScore
//   3. otherwise treat as unanalyzed (null)
export function getJobDisplayScore(job: AnalysisJobInput): JobDisplayScore {
  const comparison = buildAnalysisComparison(job)
  if (comparison.averageScore !== null) {
    return { score: comparison.averageScore, source: 'comparison' }
  }

  const primary = getPrimaryAnalysis(job)
  if (primary && primary.fitScore !== null) {
    return { score: primary.fitScore, source: 'primary' }
  }

  return { score: null, source: 'none' }
}

// True when the job has at least one identified risk.
// Priority:
//   1. TASK-022 comparison.commonRisks.length > 0
//   2. fallback to the primary analysis risks.length > 0
export function jobHasRisk(job: AnalysisJobInput): boolean {
  const comparison = buildAnalysisComparison(job)
  if (comparison.commonRisks.length > 0) {
    return true
  }

  const primary = getPrimaryAnalysis(job)
  return Boolean(primary && primary.risks.length > 0)
}
