import { describe, expect, it } from 'vitest'
import { analyzeJobLocally } from './localAnalysis'
import { defaultJapanCareerProfile } from '@/lib/profile/defaultProfile'
import type { JapanCareerProfile } from '@/lib/profile/types'

function profile(overrides: Partial<JapanCareerProfile> = {}): JapanCareerProfile {
  return { ...defaultJapanCareerProfile, ...overrides }
}

describe('analyzeJobLocally', () => {
  it('scores a strong match higher than a job with no relevant signal', () => {
    const goodJob = {
      id: '1',
      title: 'Hotel front desk staff',
      location: 'Fukuoka',
      rawText: '接客、フロント業務。未経験歓迎、研修あり。',
    }
    const blandJob = {
      id: '2',
      title: 'Untitled posting',
      rawText: '',
    }

    const goodResult = analyzeJobLocally(goodJob, defaultJapanCareerProfile)
    const blandResult = analyzeJobLocally(blandJob, defaultJapanCareerProfile)

    expect(goodResult.fitScore).toBeGreaterThan(blandResult.fitScore as number)
    expect(goodResult.recommendedAction).not.toBe('skip')
  })

  it('applies a heavy penalty for a deal breaker keyword', () => {
    const p = profile({
      preferences: {
        ...defaultJapanCareerProfile.preferences,
        dealBreakers: ['サービス残業'],
      },
    })
    const jobWithDealBreaker = {
      id: '1',
      title: 'Sales staff',
      rawText: 'サービス残業あり、厳しい環境です。',
    }
    const jobWithout = { id: '2', title: 'Sales staff', rawText: '' }

    const withResult = analyzeJobLocally(jobWithDealBreaker, p)
    const withoutResult = analyzeJobLocally(jobWithout, p)

    expect(withResult.fitScore).toBeLessThan(withoutResult.fitScore as number)
    expect(withResult.risks.length).toBeGreaterThan(0)
  })

  it('always returns a score clamped to 0-100 and a stable output shape', () => {
    const result = analyzeJobLocally({ id: '1' }, defaultJapanCareerProfile)
    expect(result.fitScore).toBeGreaterThanOrEqual(0)
    expect(result.fitScore).toBeLessThanOrEqual(100)
    expect(['apply', 'maybe', 'skip']).toContain(result.recommendedAction)
    expect(result.metadata.provider).toBe('local')
  })
})
