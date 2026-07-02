import { describe, expect, it } from 'vitest'
import {
  filterAndSortJobs,
  getScoreBucket,
  matchesSearch,
  type FilterableJob,
} from './filterJobs'

const helpers = {
  getScore: (job: FilterableJob & { score?: number | null }) =>
    job.score ?? null,
  getHasRisk: (job: FilterableJob & { risky?: boolean }) => job.risky ?? false,
  getStatus: (job: FilterableJob & { status?: string }) =>
    job.status ?? 'not_applied',
}

type TestJob = FilterableJob & {
  score?: number | null
  risky?: boolean
  status?: string
}

describe('matchesSearch', () => {
  it('matches case-insensitively across title/company/location', () => {
    const job: FilterableJob = { id: '1', title: 'Ramen Shop Staff', company: 'Ichiran' }
    expect(matchesSearch(job, 'ramen')).toBe(true)
    expect(matchesSearch(job, 'ICHIRAN')).toBe(true)
    expect(matchesSearch(job, 'sushi')).toBe(false)
  })

  it('an empty query matches everything', () => {
    expect(matchesSearch({ id: '1' }, '')).toBe(true)
    expect(matchesSearch({ id: '1' }, '   ')).toBe(true)
  })
})

describe('getScoreBucket', () => {
  it('buckets scores at the documented thresholds', () => {
    expect(getScoreBucket(null)).toBe('unanalyzed')
    expect(getScoreBucket(80)).toBe('high')
    expect(getScoreBucket(60)).toBe('medium')
    expect(getScoreBucket(59)).toBe('low')
  })
})

describe('filterAndSortJobs', () => {
  const jobs: TestJob[] = [
    { id: 'a', title: 'Hotel front desk', score: 90, status: 'applied', collectedAt: '2026-01-03' },
    { id: 'b', title: 'Ramen hall staff', score: 55, risky: true, status: 'not_applied', collectedAt: '2026-01-01' },
    { id: 'c', title: 'Cafe barista', score: null, status: 'not_applied', collectedAt: '2026-01-02' },
  ]

  it('filters by status', () => {
    const result = filterAndSortJobs(
      jobs,
      { search: '', status: 'applied', score: 'all', riskOnly: false, sort: 'newest' },
      helpers
    )
    expect(result.map((j) => j.id)).toEqual(['a'])
  })

  it('filters by score bucket', () => {
    const result = filterAndSortJobs(
      jobs,
      { search: '', status: 'all', score: 'unanalyzed', riskOnly: false, sort: 'newest' },
      helpers
    )
    expect(result.map((j) => j.id)).toEqual(['c'])
  })

  it('filters to risky jobs only', () => {
    const result = filterAndSortJobs(
      jobs,
      { search: '', status: 'all', score: 'all', riskOnly: true, sort: 'newest' },
      helpers
    )
    expect(result.map((j) => j.id)).toEqual(['b'])
  })

  it('sorts by score descending, pushing unanalyzed (null) jobs last', () => {
    const result = filterAndSortJobs(
      jobs,
      { search: '', status: 'all', score: 'all', riskOnly: false, sort: 'score_desc' },
      helpers
    )
    expect(result.map((j) => j.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts by newest collectedAt first', () => {
    const result = filterAndSortJobs(
      jobs,
      { search: '', status: 'all', score: 'all', riskOnly: false, sort: 'newest' },
      helpers
    )
    expect(result.map((j) => j.id)).toEqual(['a', 'c', 'b'])
  })

  it('never mutates the input array', () => {
    const copy = [...jobs]
    filterAndSortJobs(
      jobs,
      { search: '', status: 'all', score: 'all', riskOnly: false, sort: 'score_asc' },
      helpers
    )
    expect(jobs).toEqual(copy)
  })
})
