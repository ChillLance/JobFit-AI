import { describe, expect, it } from 'vitest'
import { hashRawText, parseExtraction } from './parseExtraction'

// Fixtures below are short, hand-written synthetic Japanese listings modeled
// on the three collected source formats (Indeed / リゾートバイト.com /
// ダイブ). They are NOT copied from data/jobfit.sqlite — see
// docs/JOB_EXTRACTION_DESIGN.md §11 ("keep fixtures synthetic").

// ---- fixture A: Indeed-style, full legal sample (26 lines) ----
const INDEED_STYLE_RAW_TEXT = `求人タイトル：ホテルフロントスタッフ募集（住み込み）
勤務地：長野県 白馬村（スキー場エリア）
アクセス：白馬駅より車で10分
雇用形態：契約社員（派遣）
運営会社：株式会社サンシャインリゾート
紹介元：株式会社ダイブ
外国人歓迎、多国籍スタッフ活躍中です。
業務内容：フロント業務全般、チェックイン・チェックアウト対応。
勤務期間：2026年12月上旬スタート、3ヶ月以上（延長相談可）。
初回契約は1ヶ月となります。
給与：時給1,300円（22時以降は1,625円）
予想月収：230,000円程度（22日勤務の場合）
月収例：閑散期 18万〜22万円
寮費：無料（個室・Wi-Fi完備）
水道光熱費：0円
食事：従業員食堂あり、1食500円
交通費：全額支給（ただし満了時に支給）
給料日：毎月25日
前払い制度あり。満了金3万円あり。
シフト：通し勤務、実働8時間、中抜けなし
残業：月10時間程度、ナイトフロントは月2回程度あり
休日：月8日
必要な言語：日本語（日常会話レベル、N3目安）
必要免許：普通自動車運転免許（AT限定可）
研修制度あり、未経験歓迎。
温泉利用OK、車の持ち込み可。
求人No：SB-88213`

function fullValidModelOutput() {
  return {
    workplaceName: '株式会社サンシャインリゾート',
    agencyName: '株式会社ダイブ',
    listingId: 'SB-88213',
    roleCategory: 'front_desk_bell',
    dutySummary: 'フロント業務全般、チェックイン・チェックアウト対応。',
    employmentType: 'haken',
    startTiming: '2026年12月上旬スタート',
    minDurationMonths: 3,
    durationNote: '初回契約は1ヶ月となります。',
    extensionPossible: true,
    requiredLanguages: [{ language: 'ja', note: '日常会話レベル' }],
    requiredLicenses: ['普通自動車運転免許（AT限定可）'],
    requiredExperience: null,
    foreignerSignals: ['外国人歓迎', '多国籍スタッフ活躍中'],
    wageType: 'hourly',
    wageMinJpy: 1300,
    wageMaxJpy: 1625,
    overtimeNote: '22時以降は1,625円',
    statedMonthlyIncomeJpy: 230000,
    incomeExamples: [{ label: '閑散期', minJpy: 180000, maxJpy: 220000 }],
    dormFeeJpy: 0,
    dormFeeNote: null,
    utilitiesFeeJpy: 0,
    utilitiesFeeNote: null,
    mealsCostType: 'paid',
    mealsCostNote: '従業員食堂あり、1食500円',
    travelReimbursement: 'full',
    travelReimbursementCapJpy: null,
    travelReimbursementCondition: '満了時に支給',
    payDay: '毎月25日',
    advancePayAvailable: true,
    completionBonusNote: '満了金3万円あり。',
    housingType: 'private_room',
    housingWifi: true,
    housingNote: '個室・Wi-Fi完備',
    mealsProvidedNote: '従業員食堂あり',
    prefecture: '長野県',
    cityArea: '白馬村',
    areaName: 'スキー場エリア',
    accessNote: '白馬駅より車で10分',
    carAllowed: true,
    onsenUse: true,
    shiftType: 'through',
    hoursNote: '実働8時間',
    nightWork: true,
    overtimeEstimate: '月10時間程度',
    holidaysPerMonthNote: '月8日',
    trainingSupport: true,
    sourceRatingScore: null,
    sourceRatingCount: null,
    redFlags: ['満了時に支給', '初回契約は1ヶ月'],
    evidence: {
      workplaceName: '株式会社サンシャインリゾート',
      agencyName: '株式会社ダイブ',
      listingId: 'SB-88213',
      dutySummary: 'フロント業務全般、チェックイン・チェックアウト対応。',
      startTiming: '2026年12月上旬スタート',
      minDurationMonths: '3ヶ月以上',
      durationNote: '初回契約は1ヶ月となります。',
      extensionPossible: '延長相談可',
      requiredLanguages: '日本語（日常会話レベル、N3目安）',
      requiredLicenses: '普通自動車運転免許（AT限定可）',
      wageMinJpy: '時給1,300円',
      wageMaxJpy: '22時以降は1,625円',
      overtimeNote: '22時以降は1,625円',
      statedMonthlyIncomeJpy: '230,000円程度',
      incomeExamples: '閑散期 18万〜22万円',
      dormFeeJpy: '寮費：無料',
      utilitiesFeeJpy: '水道光熱費：0円',
      mealsCostNote: '従業員食堂あり、1食500円',
      travelReimbursementCondition: '満了時に支給',
      payDay: '給料日：毎月25日',
      advancePayAvailable: '前払い制度あり。',
      completionBonusNote: '満了金3万円あり。',
      housingWifi: 'Wi-Fi完備',
      housingNote: '個室・Wi-Fi完備',
      mealsProvidedNote: '従業員食堂あり',
      prefecture: '長野県',
      cityArea: '白馬村',
      areaName: 'スキー場エリア',
      accessNote: '白馬駅より車で10分',
      carAllowed: '車の持ち込み可',
      onsenUse: '温泉利用OK',
      hoursNote: '実働8時間',
      nightWork: 'ナイトフロントは月2回程度あり',
      overtimeEstimate: '月10時間程度',
      holidaysPerMonthNote: '月8日',
      trainingSupport: '研修制度あり',
    },
  }
}

describe('parseExtraction — (a) full legal sample', () => {
  it('parses every field successfully with no demotions or warnings', () => {
    const result = parseExtraction(JSON.stringify(fullValidModelOutput()), {
      rawText: INDEED_STYLE_RAW_TEXT,
      model: 'test-model',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.demotedFields).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.extraction.schemaVersion).toBe(1)
    expect(result.extraction.model).toBe('test-model')
    expect(result.extraction.rawTextHash).toBe(hashRawText(INDEED_STYLE_RAW_TEXT))
    expect(result.extraction.workplaceName).toBe('株式会社サンシャインリゾート')
    expect(result.extraction.agencyName).toBe('株式会社ダイブ')
    expect(result.extraction.roleCategory).toBe('front_desk_bell')
    expect(result.extraction.wageMinJpy).toBe(1300)
    expect(result.extraction.wageMaxJpy).toBe(1625)
    expect(result.extraction.statedMonthlyIncomeJpy).toBe(230000)
    expect(result.extraction.incomeExamples).toEqual([
      { label: '閑散期', minJpy: 180000, maxJpy: 220000 },
    ])
    expect(result.extraction.dormFeeJpy).toBe(0)
    expect(result.extraction.utilitiesFeeJpy).toBe(0)
    expect(result.extraction.requiredLanguages).toEqual([{ language: 'ja', note: '日常会話レベル' }])
    expect(result.extraction.requiredLicenses).toEqual(['普通自動車運転免許（AT限定可）'])
    expect(result.extraction.foreignerSignals).toEqual(['外国人歓迎', '多国籍スタッフ活躍中'])
    expect(result.extraction.redFlags).toEqual(['満了時に支給', '初回契約は1ヶ月'])
    expect(result.extraction.housingType).toBe('private_room')
    expect(result.extraction.travelReimbursement).toBe('full')
    expect(result.extraction.travelReimbursementCondition).toBe('満了時に支給')
  })
})

describe('parseExtraction — (b) ungrounded evidence demotes to null', () => {
  it('forces a hallucinated field to null and lists it in demotedFields', () => {
    const rawText = '時給1,200円、寮費無料の住み込み求人です。'
    const modelOutput = {
      workplaceName: '架空温泉旅館', // never mentioned in rawText
      evidence: {
        workplaceName: '架空温泉旅館',
      },
    }

    const result = parseExtraction(JSON.stringify(modelOutput), {
      rawText,
      model: 'test-model',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.workplaceName).toBeNull()
    expect(result.demotedFields).toContain('workplaceName')
    expect(result.extraction.evidence.workplaceName).toBeUndefined()
  })

  it('demotes a scalar field when the evidence key is missing entirely', () => {
    const rawText = '寮費は無料です。'
    const modelOutput = { dormFeeJpy: 0 } // no evidence.dormFeeJpy at all

    const result = parseExtraction(JSON.stringify(modelOutput), {
      rawText,
      model: 'test-model',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.dormFeeJpy).toBeNull()
    expect(result.demotedFields).toContain('dormFeeJpy')
  })
})

describe('parseExtraction — (c) enum whitelist', () => {
  it('nulls out an illegal roleCategory token instead of passing it through', () => {
    const rawText = 'マネージャー候補を募集します。'
    const modelOutput = { roleCategory: 'manager' } // not in the whitelist

    const result = parseExtraction(JSON.stringify(modelOutput), {
      rawText,
      model: 'test-model',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.roleCategory).toBeNull()
  })

  it('nulls out an illegal employmentType token', () => {
    const rawText = '業務委託契約での勤務です。'
    const modelOutput = { employmentType: 'gyomu_itaku' } // not in the whitelist

    const result = parseExtraction(JSON.stringify(modelOutput), {
      rawText,
      model: 'test-model',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.employmentType).toBeNull()
  })
})

describe('parseExtraction — (d) 万-unit converted amounts', () => {
  it('accepts a wage the model already converted from 万 notation, grounded by the 万 quote', () => {
    const rawText = '月給23万円〜、賞与年2回あり。'
    const modelOutput = {
      wageType: 'monthly',
      wageMinJpy: 230000, // model performs 23万 → 230000 per prompt rule 4
      evidence: {
        wageMinJpy: '23万円',
      },
    }

    const result = parseExtraction(JSON.stringify(modelOutput), {
      rawText,
      model: 'test-model',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.wageMinJpy).toBe(230000)
    expect(result.demotedFields).not.toContain('wageMinJpy')
  })
})

describe('parseExtraction — (e) full-width digit/comma normalization', () => {
  it('matches a half-width evidence quote against full-width rawText via NFKC', () => {
    const rawText = '時給１，２００円（交通費別途支給）'
    const modelOutput = {
      wageType: 'hourly',
      wageMinJpy: 1200,
      evidence: {
        wageMinJpy: '時給1,200円', // half-width, comma present
      },
    }

    const result = parseExtraction(JSON.stringify(modelOutput), {
      rawText,
      model: 'test-model',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.wageMinJpy).toBe(1200)
    expect(result.demotedFields).not.toContain('wageMinJpy')
  })
})

describe('parseExtraction — numeric sanity warnings (warn-only, not demoted)', () => {
  it('warns when wageMinJpy exceeds wageMaxJpy but keeps both values', () => {
    const rawText = '時給2,500円〜2,000円という表記の求人。'
    const modelOutput = {
      wageType: 'hourly',
      wageMinJpy: 2500,
      wageMaxJpy: 2000,
      evidence: {
        wageMinJpy: '2,500円',
        wageMaxJpy: '2,000円',
      },
    }

    const result = parseExtraction(JSON.stringify(modelOutput), {
      rawText,
      model: 'test-model',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.wageMinJpy).toBe(2500)
    expect(result.extraction.wageMaxJpy).toBe(2000)
    expect(result.warnings.some((w) => w.includes('wageMinJpy'))).toBe(true)
  })

  it('warns when an hourly wage is outside the plausible 800-5000 JPY range', () => {
    const rawText = '時給50,000円という破格の待遇。'
    const modelOutput = {
      wageType: 'hourly',
      wageMinJpy: 50000,
      evidence: { wageMinJpy: '50,000円' },
    }

    const result = parseExtraction(JSON.stringify(modelOutput), {
      rawText,
      model: 'test-model',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.wageMinJpy).toBe(50000)
    expect(result.warnings.some((w) => w.includes('hourly'))).toBe(true)
  })
})

describe('parseExtraction — parse_error path', () => {
  it('fails closed on unparseable model output', () => {
    const result = parseExtraction('this is not JSON at all {{{', {
      rawText: '何かの求人テキスト。',
      model: 'test-model',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('parse_error')
  })

  it('strips a single markdown fence before parsing', () => {
    const rawText = 'テスト求人テキスト。'
    const fenced = '```json\n{"workplaceName": null}\n```'

    const result = parseExtraction(fenced, { rawText, model: 'test-model' })

    expect(result.ok).toBe(true)
  })
})
