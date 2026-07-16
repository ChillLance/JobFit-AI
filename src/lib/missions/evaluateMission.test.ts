import { describe, expect, it } from 'vitest'
import type { JobExtraction } from '@/types/extraction'
import { createBlankSearchMission } from './missionStore'
import { evaluateJobForMission, inferApplicationRoute } from './evaluateMission'

function extraction(overrides: Partial<JobExtraction> = {}): JobExtraction {
  return {
    schemaVersion: 1, extractedAt: '2026-07-16T00:00:00.000Z', model: 'test', rawTextHash: 'test',
    workplaceName: null, agencyName: null, listingId: null, roleCategory: null, dutySummary: null,
    employmentType: null, startTiming: null, minDurationMonths: null, durationNote: null, extensionPossible: null,
    requiredLanguages: [], requiredLicenses: [], requiredExperience: null, foreignerSignals: [],
    wageType: 'monthly', wageMinJpy: 250000, wageMaxJpy: null, overtimeNote: null,
    statedMonthlyIncomeJpy: 250000, incomeExamples: [], dormFeeJpy: 0, dormFeeNote: null,
    utilitiesFeeJpy: null, utilitiesFeeNote: null, mealsCostType: null, mealsCostNote: null,
    travelReimbursement: null, travelReimbursementCapJpy: null, travelReimbursementCondition: null,
    payDay: null, advancePayAvailable: null, completionBonusNote: null,
    housingType: 'private_room', housingWifi: null, housingNote: null, mealsProvidedNote: null,
    prefecture: '北海道', cityArea: null, areaName: 'ニセコ', accessNote: null,
    carAllowed: null, onsenUse: null, shiftType: 'through', hoursNote: null,
    nightWork: false, overtimeEstimate: null, holidaysPerMonthNote: null, trainingSupport: null,
    sourceRatingScore: null, sourceRatingCount: null, redFlags: [], evidence: {},
    ...overrides,
  }
}

describe('evaluateJobForMission', () => {
  it('keeps an explicit hard constraint separate from the existing fit score', () => {
    const mission = createBlankSearchMission()
    mission.constraints.privateRoomRequired = true
    const result = evaluateJobForMission({ extraction: extraction({ housingType: 'shared_room' }) }, mission)
    expect(result.status).toBe('not_recommended')
    expect(result.reasons.some((reason) => reason.kind === 'blocker')).toBe(true)
  })

  it('asks for confirmation instead of guessing a missing required condition', () => {
    const mission = createBlankSearchMission()
    mission.constraints.maximumDormFeeJpy = 10000
    const result = evaluateJobForMission({ extraction: extraction({ dormFeeJpy: null }) }, mission)
    expect(result.status).toBe('confirm')
    expect(result.reasons.some((reason) => reason.kind === 'unknown')).toBe(true)
  })

  it('surfaces user-confirmed mission keywords without inventing a score', () => {
    const mission = createBlankSearchMission()
    mission.matchKeywords = ['ニセコ', 'スキー']
    const result = evaluateJobForMission({ location: '北海道 ニセコ', extraction: extraction() }, mission)
    expect(result.status).toBe('apply')
    expect(result.reasons.some((reason) => reason.code === 'keyword_match')).toBe(true)
  })

  it('identifies agency listings from structured extraction, not their source URL', () => {
    expect(inferApplicationRoute({ extraction: extraction({ agencyName: '株式会社ダイブ' }) })).toBe('agency')
    expect(inferApplicationRoute({ rawText: '派遣スタッフを募集します' })).toBe('agency')
  })
})
