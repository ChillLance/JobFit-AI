import { describe, expect, it } from 'vitest'
import { analyzeAllJobsLocally } from './analyzeAllJobsLocally'
import { defaultJapanCareerProfile } from '@/lib/profile/defaultProfile'

describe('analyzeAllJobsLocally', () => {
  it('analyzes every job and keeps ids correctly paired with their result', () => {
    const jobs = [
      {
        id: '1',
        title: 'Hotel front desk staff',
        location: 'Fukuoka',
        rawText: '接客、フロント業務。未経験歓迎、研修あり。',
      },
      { id: '2', title: 'Untitled posting', rawText: '' },
      {
        id: '3',
        title: 'Sales staff',
        rawText: 'サービス残業あり、厳しい環境です。',
      },
    ]

    const results = analyzeAllJobsLocally(jobs, defaultJapanCareerProfile)

    expect(results).toHaveLength(jobs.length)
    expect(results.map((entry) => entry.id)).toEqual(['1', '2', '3'])
    for (const entry of results) {
      expect(entry.result.jobId).toBe(entry.id)
    }
  })

  it('returns an empty array for an empty jobs list', () => {
    expect(analyzeAllJobsLocally([], defaultJapanCareerProfile)).toEqual([])
  })

  it('each result has a score-bearing, stable local analysis shape', () => {
    const jobs = [
      {
        id: 'a',
        title: 'Hotel front desk staff',
        rawText: '接客、フロント業務。未経験歓迎、研修あり。',
      },
    ]

    const [entry] = analyzeAllJobsLocally(jobs, defaultJapanCareerProfile)

    expect(entry.id).toBe('a')
    expect(entry.result.fitScore).toBeGreaterThanOrEqual(0)
    expect(entry.result.fitScore).toBeLessThanOrEqual(100)
    expect(['apply', 'maybe', 'skip']).toContain(entry.result.recommendedAction)
    expect(entry.result.metadata.provider).toBe('local')
  })
})
