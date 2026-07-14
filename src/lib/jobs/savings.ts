// Net monthly savings estimate (TASK-030 follow-up).
//
// Working-holiday candidates often care less about headline pay and more
// about what's actually left over after dorm/utilities/meals are deducted —
// a job with modest pay but fully-covered housing and meals can out-save a
// higher-paying job with none of that covered. This module estimates that
// net figure from `job.extraction` (see src/types/extraction.ts).
//
// Pure module: no fs, no network. Returns null whenever the estimate would be
// too speculative to be useful (most importantly: unknown dorm fee, the
// single biggest variable).

import type { JobExtraction } from '@/types/extraction'
import { getJobSalaryEstimate } from './salary'

export type SavingsAnalyzableJob = {
  extraction?: JobExtraction | null
  salary?: string
  rawText?: string
}

export type SavingsEstimate = {
  /** Estimated net monthly savings in JPY. Can be negative. */
  savingsJpy: number
  incomeJpy: number
  /** 'stated' = extraction.statedMonthlyIncomeJpy; 'estimated' = back-solved from salary text. */
  incomeSource: 'stated' | 'estimated'
  costs: {
    dormJpy: number
    utilitiesJpy: number
    mealsJpy: number
    miscJpy: number
  }
  /** Machine-readable codes for which figures are assumptions vs. stated facts. */
  assumptions: string[]
}

// Assumption constants (JPY/month) used whenever the listing doesn't state a
// figure. Kept as named consts (not inline magic numbers) so the rationale is
// visible at the call site and can be tuned in one place.
const DEFAULT_UTILITIES_JPY = 10_000
const MEALS_PARTIAL_ASSUMED_JPY = 20_000
const MEALS_UNKNOWN_ASSUMED_JPY = 30_000
const MISC_BASELINE_JPY = 20_000

/**
 * Estimate a job's net monthly savings from its extraction fields.
 * Returns null when the estimate would be too speculative:
 * - no income figure available at all (neither stated nor back-solvable), or
 * - dorm fee is unknown (the single biggest variable in the estimate).
 */
export function estimateMonthlySavings(
  job: SavingsAnalyzableJob
): SavingsEstimate | null {
  const extraction = job.extraction
  if (!extraction) return null

  const assumptions: string[] = []

  // ---- income --------------------------------------------------------
  let incomeJpy: number
  let incomeSource: 'stated' | 'estimated'
  if (typeof extraction.statedMonthlyIncomeJpy === 'number') {
    incomeJpy = extraction.statedMonthlyIncomeJpy
    incomeSource = 'stated'
  } else {
    const backsolved = getJobSalaryEstimate(job)?.monthlyJpy
    if (typeof backsolved !== 'number') return null
    incomeJpy = backsolved
    incomeSource = 'estimated'
    assumptions.push('income_backsolved')
  }

  // ---- dorm fee — the biggest variable; unknown means no estimate ----
  if (typeof extraction.dormFeeJpy !== 'number') return null
  const dormJpy = extraction.dormFeeJpy

  // ---- utilities -------------------------------------------------------
  let utilitiesJpy: number
  if (typeof extraction.utilitiesFeeJpy === 'number') {
    utilitiesJpy = extraction.utilitiesFeeJpy
  } else {
    utilitiesJpy = DEFAULT_UTILITIES_JPY
    assumptions.push('utilities_assumed')
  }

  // ---- meals -------------------------------------------------------
  let mealsJpy: number
  switch (extraction.mealsCostType) {
    case 'free':
      mealsJpy = 0
      break
    case 'paid':
    case 'partial':
      mealsJpy = MEALS_PARTIAL_ASSUMED_JPY
      assumptions.push('meals_partial_assumed')
      break
    case 'not_provided':
    case null:
    default:
      mealsJpy = MEALS_UNKNOWN_ASSUMED_JPY
      assumptions.push('meals_assumed')
      break
  }

  // ---- misc + cross-cutting assumptions -----------------------------
  const miscJpy = MISC_BASELINE_JPY
  assumptions.push('misc_baseline')
  assumptions.push('tax_not_included')

  const savingsJpy = incomeJpy - dormJpy - utilitiesJpy - mealsJpy - miscJpy

  return {
    savingsJpy,
    incomeJpy,
    incomeSource,
    costs: { dormJpy, utilitiesJpy, mealsJpy, miscJpy },
    assumptions,
  }
}
