import { describe, expect, it } from 'vitest'
import { estimateMonthlySavings } from './savings'
import type { JobExtraction } from '@/types/extraction'

// Minimal "empty" extraction fixture — mirrors the fixture pattern used in
// src/lib/extraction/collectUpsert.test.ts. Callers override only the fields
// relevant to their test.
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

describe('estimateMonthlySavings', () => {
  it('computes savings from a fully-stated income with all costs known', () => {
    const estimate = estimateMonthlySavings({
      extraction: fakeExtraction({
        statedMonthlyIncomeJpy: 220_000,
        dormFeeJpy: 0,
        utilitiesFeeJpy: 5_000,
        mealsCostType: 'free',
      }),
    })

    expect(estimate).not.toBeNull()
    expect(estimate?.incomeSource).toBe('stated')
    expect(estimate?.incomeJpy).toBe(220_000)
    expect(estimate?.costs).toEqual({
      dormJpy: 0,
      utilitiesJpy: 5_000,
      mealsJpy: 0,
      miscJpy: 20_000,
    })
    // 220,000 - 0 - 5,000 - 0 - 20,000 = 195,000
    expect(estimate?.savingsJpy).toBe(195_000)
    expect(estimate?.assumptions).toContain('tax_not_included')
    expect(estimate?.assumptions).toContain('misc_baseline')
    expect(estimate?.assumptions).not.toContain('income_backsolved')
  })

  it('back-solves income from salary text when statedMonthlyIncomeJpy is missing, flagging the assumption', () => {
    const estimate = estimateMonthlySavings({
      salary: '月給 250,000円',
      extraction: fakeExtraction({
        statedMonthlyIncomeJpy: null,
        dormFeeJpy: 20_000,
        mealsCostType: 'partial',
      }),
    })

    expect(estimate).not.toBeNull()
    expect(estimate?.incomeSource).toBe('estimated')
    expect(estimate?.incomeJpy).toBe(250_000)
    expect(estimate?.assumptions).toContain('income_backsolved')
  })

  it('returns null when dorm fee is unknown, regardless of income', () => {
    const estimate = estimateMonthlySavings({
      extraction: fakeExtraction({
        statedMonthlyIncomeJpy: 220_000,
        dormFeeJpy: null,
      }),
    })
    expect(estimate).toBeNull()
  })

  it('returns null when no extraction is present at all', () => {
    expect(estimateMonthlySavings({})).toBeNull()
  })

  it('distinguishes free meals (0) from unknown meals cost (assumed 30,000)', () => {
    const free = estimateMonthlySavings({
      extraction: fakeExtraction({
        statedMonthlyIncomeJpy: 200_000,
        dormFeeJpy: 0,
        mealsCostType: 'free',
      }),
    })
    const unknown = estimateMonthlySavings({
      extraction: fakeExtraction({
        statedMonthlyIncomeJpy: 200_000,
        dormFeeJpy: 0,
        mealsCostType: null,
      }),
    })

    expect(free?.costs.mealsJpy).toBe(0)
    expect(unknown?.costs.mealsJpy).toBe(30_000)
    expect(unknown?.assumptions).toContain('meals_assumed')
    expect(free?.savingsJpy).toBeGreaterThan(unknown?.savingsJpy as number)
  })

  it('returns a negative savings figure as-is when costs exceed income', () => {
    const estimate = estimateMonthlySavings({
      extraction: fakeExtraction({
        statedMonthlyIncomeJpy: 30_000,
        dormFeeJpy: 20_000,
        utilitiesFeeJpy: 10_000,
        mealsCostType: 'not_provided',
      }),
    })

    expect(estimate).not.toBeNull()
    // 30,000 - 20,000 - 10,000 - 30,000 - 20,000 = -50,000
    expect(estimate?.savingsJpy).toBe(-50_000)
  })
})
