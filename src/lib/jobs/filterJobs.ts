import { getJobSalaryEstimate } from './salary'
import { estimateMonthlySavings } from './savings'
import type { JobExtraction } from '@/types/extraction'

// Pure client-side filtering + sorting for the job list (TASK-023).
// No API calls, no AI. Operates only on fields already present on a job plus
// caller-supplied derived getters (score / risk / status) so this stays
// decoupled from the status enum and the analysis schema.

export type JobStatusFilter = 'all' | string

export type ScoreFilter = 'all' | 'high' | 'medium' | 'low' | 'unanalyzed'

export type JobSortKey =
  | 'newest'
  | 'oldest'
  | 'score_desc'
  | 'score_asc'
  | 'salary_desc'
  | 'salary_asc'
  | 'savings_desc'
  | 'company_asc'
  | 'title_asc'

// Loose job shape. Most postings only carry title / rawText / url / collectedAt;
// the optional structured fields are read when present (future-proofing) and
// otherwise ignored.
export type FilterableJob = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  company?: string
  location?: string
  employmentType?: string
  collectedAt?: string
  scrapedAt?: string
  salary?: string
  savedAt?: string
  updatedAt?: string
  createdAt?: string
  // Structured LLM extraction (present for some jobs — see src/types/extraction.ts).
  // Read-only here; only used to derive the 'savings_desc' sort key.
  extraction?: JobExtraction | null
}

export type JobFilterState = {
  search: string
  status: JobStatusFilter
  score: ScoreFilter
  riskOnly: boolean
  sort: JobSortKey
}

// Caller-supplied derived getters. Keeping these out of this module avoids
// coupling the filter logic to the status enum or the analysis schema.
export type JobFilterHelpers<T extends FilterableJob> = {
  getScore: (job: T) => number | null
  getHasRisk: (job: T) => boolean
  getStatus: (job: T) => string
}

export const DEFAULT_FILTER_STATE: JobFilterState = {
  search: '',
  status: 'all',
  score: 'all',
  riskOnly: false,
  sort: 'newest',
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// Build the case-insensitive haystack a search query is matched against.
// Company / location / employment type usually live inside the title and raw
// text, so those are always included; structured fields are added when present.
export function getJobSearchText(job: FilterableJob): string {
  return [
    job.title,
    job.company,
    job.location,
    job.employmentType,
    job.source,
    job.url,
    job.rawText,
  ]
    .map(asString)
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// Case-insensitive substring match. Works for Chinese / English / Japanese
// because toLowerCase is a no-op for CJK and we only do substring containment.
export function matchesSearch(job: FilterableJob, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return getJobSearchText(job).includes(q)
}

export function getJobCompany(job: FilterableJob): string {
  return asString(job.company).trim()
}

export function getJobTitle(job: FilterableJob): string {
  return asString(job.title).trim()
}

// First parseable timestamp from the most likely date fields. Returns null when
// no usable date exists so sorting can keep such jobs in their original order.
export function getJobTimestamp(job: FilterableJob): number | null {
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

export function getScoreBucket(score: number | null): ScoreFilter {
  if (score === null) return 'unanalyzed'
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

function matchesScoreFilter(score: number | null, filter: ScoreFilter): boolean {
  if (filter === 'all') return true
  return getScoreBucket(score) === filter
}

// Filter + sort a list of jobs. Returns a new array; never mutates the input.
// Scores and salary estimates are derived once per job and cached so sorting
// does not recompute them.
export function filterAndSortJobs<T extends FilterableJob>(
  jobs: T[],
  state: JobFilterState,
  helpers: JobFilterHelpers<T>
): T[] {
  const scoreCache = new Map<string, number | null>()
  const salaryCache = new Map<string, number | null>()
  const savingsCache = new Map<string, number | null>()
  const scoreOf = (job: T): number | null => {
    const cached = scoreCache.get(job.id)
    if (cached !== undefined) return cached
    const value = helpers.getScore(job)
    scoreCache.set(job.id, value)
    return value
  }
  const salaryOf = (job: T): number | null => {
    const cached = salaryCache.get(job.id)
    if (cached !== undefined) return cached
    const value = getJobSalaryEstimate(job)?.monthlyJpy ?? null
    salaryCache.set(job.id, value)
    return value
  }
  const savingsOf = (job: T): number | null => {
    const cached = savingsCache.get(job.id)
    if (cached !== undefined) return cached
    const value = estimateMonthlySavings(job)?.savingsJpy ?? null
    savingsCache.set(job.id, value)
    return value
  }

  const filtered = jobs.filter((job) => {
    if (!matchesSearch(job, state.search)) return false
    if (state.status !== 'all' && helpers.getStatus(job) !== state.status) {
      return false
    }
    if (!matchesScoreFilter(scoreOf(job), state.score)) return false
    if (state.riskOnly && !helpers.getHasRisk(job)) return false
    return true
  })

  return sortJobs(filtered, state.sort, scoreOf, salaryOf, savingsOf)
}

// Sort a copy of the list. Jobs missing the relevant value are pushed to the
// end while otherwise preserving their original (stable) order.
function sortJobs<T extends FilterableJob>(
  jobs: T[],
  sort: JobSortKey,
  scoreOf: (job: T) => number | null,
  salaryOf: (job: T) => number | null,
  savingsOf: (job: T) => number | null
): T[] {
  const copy = [...jobs]

  switch (sort) {
    case 'newest':
    case 'oldest': {
      const direction = sort === 'newest' ? -1 : 1
      return copy.sort((a, b) => {
        const ta = getJobTimestamp(a)
        const tb = getJobTimestamp(b)
        if (ta === null && tb === null) return 0
        if (ta === null) return 1
        if (tb === null) return -1
        return (ta - tb) * direction
      })
    }

    case 'score_desc':
    case 'score_asc': {
      const direction = sort === 'score_desc' ? -1 : 1
      return copy.sort((a, b) => {
        const sa = scoreOf(a)
        const sb = scoreOf(b)
        if (sa === null && sb === null) return 0
        if (sa === null) return 1
        if (sb === null) return -1
        return (sa - sb) * direction
      })
    }

    case 'salary_desc':
    case 'salary_asc': {
      const direction = sort === 'salary_desc' ? -1 : 1
      return copy.sort((a, b) => {
        const sa = salaryOf(a)
        const sb = salaryOf(b)
        if (sa === null && sb === null) return 0
        if (sa === null) return 1
        if (sb === null) return -1
        return (sa - sb) * direction
      })
    }

    case 'savings_desc': {
      return copy.sort((a, b) => {
        const sa = savingsOf(a)
        const sb = savingsOf(b)
        if (sa === null && sb === null) return 0
        if (sa === null) return 1
        if (sb === null) return -1
        return sb - sa
      })
    }

    case 'company_asc':
      return copy.sort((a, b) => {
        const ca = getJobCompany(a)
        const cb = getJobCompany(b)
        if (!ca && !cb) return 0
        if (!ca) return 1
        if (!cb) return -1
        return ca.localeCompare(cb)
      })

    case 'title_asc':
      return copy.sort((a, b) => {
        const ta = getJobTitle(a)
        const tb = getJobTitle(b)
        if (!ta && !tb) return 0
        if (!ta) return 1
        if (!tb) return -1
        return ta.localeCompare(tb)
      })

    default:
      return copy
  }
}
