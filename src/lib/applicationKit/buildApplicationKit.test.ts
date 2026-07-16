import { describe, expect, it } from 'vitest'
import { createBlankSearchMission } from '@/lib/missions'
import { defaultJapanCareerProfile } from '@/lib/profile/defaultProfile'
import type { JobExtraction } from '@/types/extraction'
import { buildApplicationKit } from './buildApplicationKit'

function extraction(overrides: Partial<JobExtraction> = {}): JobExtraction {
  return {
    schemaVersion: 1, extractedAt: '2026-07-16T00:00:00.000Z', model: 'test', rawTextHash: 'test',
    workplaceName: 'テスト旅館', agencyName: null, listingId: null, roleCategory: 'front_desk_bell', dutySummary: 'フロントでの接客と案内',
    employmentType: 'parttime_baito', startTiming: null, minDurationMonths: null, durationNote: null, extensionPossible: null,
    requiredLanguages: [], requiredLicenses: [], requiredExperience: null, foreignerSignals: [],
    wageType: 'monthly', wageMinJpy: null, wageMaxJpy: null, overtimeNote: null, statedMonthlyIncomeJpy: 240000, incomeExamples: [], dormFeeJpy: null, dormFeeNote: null,
    utilitiesFeeJpy: null, utilitiesFeeNote: null, mealsCostType: null, mealsCostNote: null, travelReimbursement: null, travelReimbursementCapJpy: null, travelReimbursementCondition: null,
    payDay: null, advancePayAvailable: null, completionBonusNote: null, housingType: null, housingWifi: null, housingNote: null, mealsProvidedNote: null,
    prefecture: '北海道', cityArea: null, areaName: 'ニセコ', accessNote: null, carAllowed: null, onsenUse: null,
    shiftType: null, hoursNote: null, nightWork: null, overtimeEstimate: null, holidaysPerMonthNote: null, trainingSupport: null,
    sourceRatingScore: null, sourceRatingCount: null, redFlags: [], evidence: {}, ...overrides,
  }
}

describe('buildApplicationKit', () => {
  it('uses profile and listing facts without turning missing data into claims', () => {
    const mission = createBlankSearchMission()
    mission.experienceGoals = ['冬の雪山で暮らす']
    mission.constraints.privateRoomRequired = true
    const kit = buildApplicationKit({ job: { id: 'job_1', extraction: extraction() }, profile: defaultJapanCareerProfile, mission })

    expect(kit.motivationDraft).toContain('テスト旅館')
    expect(kit.motivationDraft).toContain(defaultJapanCareerProfile.strengths[0])
    expect(kit.desiredConditionsDraft).toContain('個室')
    expect(kit.questions).toContain('勤務開始可能日と、最低契約期間・延長の可能性を教えていただけますか。')
    expect(kit.questions.some((question) => question.includes('寮の部屋タイプ'))).toBe(true)
    expect(kit.savings).toBeNull()
    expect(kit.polishPrompt).toContain('[listing] 募集先: テスト旅館')
    expect(kit.polishPrompt).not.toContain('架空の実績')
  })

  it('marks agency questions as later-stage rather than first-contact questions', () => {
    const kit = buildApplicationKit({
      job: { id: 'job_2', extraction: extraction({ agencyName: '派遣会社テスト', dormFeeJpy: 0, housingType: 'private_room', mealsCostType: 'free', shiftType: 'through', nightWork: false }) },
      profile: defaultJapanCareerProfile,
      mission: null,
    })
    expect(kit.questionsTiming).toBe('after_agency_match')
  })
})
