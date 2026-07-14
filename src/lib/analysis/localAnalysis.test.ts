import { describe, expect, it } from 'vitest'
import { analyzeJobLocally } from './localAnalysis'
import { defaultJapanCareerProfile } from '@/lib/profile/defaultProfile'
import type { JapanCareerProfile, ProfileWorkingHoliday } from '@/lib/profile/types'
import type { JobExtraction } from '@/types/extraction'

function profile(overrides: Partial<JapanCareerProfile> = {}): JapanCareerProfile {
  return { ...defaultJapanCareerProfile, ...overrides }
}

function workingHoliday(
  overrides: Partial<ProfileWorkingHoliday> = {}
): ProfileWorkingHoliday {
  return {
    hasDriverLicense: null,
    splitShiftTolerance: null,
    availableMonths: null,
    availableFrom: null,
    targetMonthlySavingsJpy: null,
    privateRoomRequired: null,
    ...overrides,
  }
}

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

  // ---- Extraction-driven financial visibility (TASK-030 follow-up) --------

  it('rewards a job with a fully-free dorm (financial blind spot fix)', () => {
    const withFreeDorm = {
      id: '1',
      title: 'Ryokan staff',
      extraction: fakeExtraction({ dormFeeJpy: 0 }),
    }
    const withoutExtraction = { id: '2', title: 'Ryokan staff' }

    const withResult = analyzeJobLocally(withFreeDorm, defaultJapanCareerProfile)
    const withoutResult = analyzeJobLocally(
      withoutExtraction,
      defaultJapanCareerProfile
    )

    expect(withResult.fitScore).toBeGreaterThan(withoutResult.fitScore as number)
    expect(withResult.strengths.some((s) => s.includes('寮費0円'))).toBe(true)
  })

  it('heavily penalizes a required driver license the candidate does not have', () => {
    const p = profile({
      workingHoliday: workingHoliday({ hasDriverLicense: false }),
    })
    const jobRequiringLicense = {
      id: '1',
      title: 'Delivery staff',
      extraction: fakeExtraction({ requiredLicenses: ['普通自動車運転免許'] }),
    }
    const jobWithoutRequirement = {
      id: '2',
      title: 'Delivery staff',
      extraction: fakeExtraction({ requiredLicenses: [] }),
    }

    const withLicenseReq = analyzeJobLocally(jobRequiringLicense, p)
    const withoutLicenseReq = analyzeJobLocally(jobWithoutRequirement, p)

    expect(withLicenseReq.fitScore).toBeLessThan(
      withoutLicenseReq.fitScore as number
    )
    expect(withLicenseReq.risks.some((r) => r.includes('駕照'))).toBe(true)
  })

  it('penalizes a minimum duration that exceeds how long the candidate can work', () => {
    const p = profile({
      workingHoliday: workingHoliday({ availableMonths: 3 }),
    })
    const jobTooLong = {
      id: '1',
      title: 'Onsen staff',
      extraction: fakeExtraction({ minDurationMonths: 6 }),
    }
    const jobFits = {
      id: '2',
      title: 'Onsen staff',
      extraction: fakeExtraction({ minDurationMonths: 2 }),
    }

    const tooLongResult = analyzeJobLocally(jobTooLong, p)
    const fitsResult = analyzeJobLocally(jobFits, p)

    expect(tooLongResult.fitScore).toBeLessThan(fitsResult.fitScore as number)
    expect(tooLongResult.risks.some((r) => r.includes('最短勤務期間'))).toBe(
      true
    )
  })

  it('penalizes a split shift (中抜け) when the candidate wants to avoid it', () => {
    const p = profile({
      workingHoliday: workingHoliday({ splitShiftTolerance: 'avoid' }),
    })
    const splitShiftJob = {
      id: '1',
      title: 'Cafe staff',
      extraction: fakeExtraction({ shiftType: 'split' }),
    }
    const throughShiftJob = {
      id: '2',
      title: 'Cafe staff',
      extraction: fakeExtraction({ shiftType: 'through' }),
    }

    const splitResult = analyzeJobLocally(splitShiftJob, p)
    const throughResult = analyzeJobLocally(throughShiftJob, p)

    expect(splitResult.fitScore).toBeLessThan(throughResult.fitScore as number)
    expect(splitResult.risks.some((r) => r.includes('中抜け'))).toBe(true)
  })

  it('behaves identically to the pre-extraction baseline when no extraction is present (regression guard)', () => {
    const p = profile({
      workingHoliday: workingHoliday({
        hasDriverLicense: false,
        splitShiftTolerance: 'avoid',
        availableMonths: 2,
        targetMonthlySavingsJpy: 100_000,
      }),
    })
    const job = {
      id: '1',
      title: 'Hotel front desk staff',
      location: 'Fukuoka',
      rawText: '接客、フロント業務。未経験歓迎、研修あり。',
    }

    const result = analyzeJobLocally(job, p)
    const baseline = analyzeJobLocally(job, {
      ...p,
      workingHoliday: undefined,
    })

    // Compare everything except the wall-clock timestamps (metadata.analyzedAt /
    // metadata.createdAt), which legitimately differ between the two calls.
    const { metadata: resultMeta, ...resultRest } = result
    const { metadata: baselineMeta, ...baselineRest } = baseline
    expect(resultRest).toEqual(baselineRest)
    expect({ ...resultMeta, analyzedAt: '', createdAt: '' }).toEqual({
      ...baselineMeta,
      analyzedAt: '',
      createdAt: '',
    })
  })
})
