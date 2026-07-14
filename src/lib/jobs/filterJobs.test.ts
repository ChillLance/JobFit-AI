import { describe, expect, it } from 'vitest'
import {
  filterAndSortJobs,
  getScoreBucket,
  matchesSearch,
  type FilterableJob,
} from './filterJobs'
import type { JobExtraction } from '@/types/extraction'

// Minimal "empty" extraction fixture — mirrors the fixture pattern used in
// src/lib/extraction/collectUpsert.test.ts / src/lib/jobs/savings.test.ts.
function fakeExtraction(overrides: Partial<JobExtraction> = {}): JobExtraction {
  return {
    schemaVersion: 1,
    extractedAt: '2026-07-14T00:00:00.000Z',
    model: 'test-model',
    rawTextHash: 'hash',
    workplaceName: null,
    agencyName: null,
    listingId: null,
    roleCategory: null,
    dutySummary: null,
    employmentType: null,
    startTiming: null,
    minDurationMonths: null,
    durationNote: null,
    extensionPossible: null,
    requiredLanguages: [],
    requiredLicenses: [],
    requiredExperience: null,
    foreignerSignals: [],
    wageType: null,
    wageMinJpy: null,
    wageMaxJpy: null,
    overtimeNote: null,
    statedMonthlyIncomeJpy: null,
    incomeExamples: [],
    dormFeeJpy: null,
    dormFeeNote: null,
    utilitiesFeeJpy: null,
    utilitiesFeeNote: null,
    mealsCostType: null,
    mealsCostNote: null,
    travelReimbursement: null,
    travelReimbursementCapJpy: null,
    travelReimbursementCondition: null,
    payDay: null,
    advancePayAvailable: null,
    completionBonusNote: null,
    housingType: null,
    housingWifi: null,
    housingNote: null,
    mealsProvidedNote: null,
    prefecture: null,
    cityArea: null,
    areaName: null,
    accessNote: null,
    carAllowed: null,
    onsenUse: null,
    shiftType: null,
    hoursNote: null,
    nightWork: null,
    overtimeEstimate: null,
    holidaysPerMonthNote: null,
    trainingSupport: null,
    sourceRatingScore: null,
    sourceRatingCount: null,
    redFlags: [],
    evidence: {},
    ...overrides,
  }
}

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

  it('sorts salary estimates by normalized monthly JPY, keeping unknown salaries last', () => {
    const salaryJobs: TestJob[] = [
      { id: 'hourly', salary: '時給 1,500円' },
      { id: 'monthly', salary: '月給 300,000円' },
      { id: 'annual', salary: '年収 4,800,000円' },
      { id: 'unknown', salary: '応相談' },
    ]

    const highToLow = filterAndSortJobs(
      salaryJobs,
      { search: '', status: 'all', score: 'all', riskOnly: false, sort: 'salary_desc' },
      helpers
    )
    const lowToHigh = filterAndSortJobs(
      salaryJobs,
      { search: '', status: 'all', score: 'all', riskOnly: false, sort: 'salary_asc' },
      helpers
    )

    expect(highToLow.map((job) => job.id)).toEqual([
      'annual',
      'monthly',
      'hourly',
      'unknown',
    ])
    expect(lowToHigh.map((job) => job.id)).toEqual([
      'hourly',
      'monthly',
      'annual',
      'unknown',
    ])
  })

  it('sorts by estimated monthly savings descending, pushing jobs with no estimate last', () => {
    const savingsJobs: TestJob[] = [
      {
        id: 'high-savings',
        extraction: fakeExtraction({
          statedMonthlyIncomeJpy: 250_000,
          dormFeeJpy: 0,
          utilitiesFeeJpy: 0,
          mealsCostType: 'free',
        }),
      },
      {
        id: 'low-savings',
        extraction: fakeExtraction({
          statedMonthlyIncomeJpy: 200_000,
          dormFeeJpy: 30_000,
          utilitiesFeeJpy: 10_000,
          mealsCostType: 'not_provided',
        }),
      },
      {
        id: 'no-estimate',
        extraction: fakeExtraction({
          statedMonthlyIncomeJpy: 200_000,
          dormFeeJpy: null,
        }),
      },
      { id: 'no-extraction' },
    ]

    const result = filterAndSortJobs(
      savingsJobs,
      { search: '', status: 'all', score: 'all', riskOnly: false, sort: 'savings_desc' },
      helpers
    )

    expect(result.map((j) => j.id)).toEqual([
      'high-savings',
      'low-savings',
      'no-estimate',
      'no-extraction',
    ])
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
