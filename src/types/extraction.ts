/**
 * Schema v1 for rawText → structured field extraction (LLM-assisted).
 *
 * See docs/JOB_EXTRACTION_DESIGN.md §4 for the full design rationale. This
 * type is the single source of truth for the extraction result stored at
 * `job.extraction` — the prompt builder (`buildExtractionPrompt`) and the
 * validator (`parseExtraction`) both target this shape.
 *
 * Design principles (design doc §3, kept here as a quick reference):
 * - Extract, don't judge — no scores/recommendations in this schema.
 * - Quote-grounded or null — every non-classification field is either backed
 *   by a verbatim `evidence` quote or forced to `null`.
 * - `null` means "the listing does not state this" (a first-class value).
 */

export type JobExtraction = {
  schemaVersion: 1
  extractedAt: string // ISO, set by server
  model: string // e.g. 'gemini-flash'
  rawTextHash: string // sha256 hex of rawText, set by server

  // ---- identity ----
  workplaceName: string | null // actual facility (慶雲館), NOT the agency
  agencyName: string | null // 派遣/紹介会社 (ダイブ, スタッフエージェント…)
  listingId: string | null // 求人No / お仕事NO on the source site
  roleCategory: // classification field (no quote needed)
    | 'front_desk_bell'
    | 'room_attendant'
    | 'restaurant_service'
    | 'kitchen'
    | 'cleaning_backyard'
    | 'shop_sales'
    | 'office_reservation'
    | 'general_all'
    | 'night_front'
    | 'other'
    | null
  dutySummary: string | null // ≤100 chars, source language

  // ---- layer 1: eligibility ----
  employmentType: // classification field
    | 'haken'
    | 'contract'
    | 'fulltime'
    | 'parttime_baito'
    | 'shoukai'
    | 'other'
    | null
  startTiming: string | null // '10月上旬・中旬' / '即日'
  minDurationMonths: number | null // '2ヶ月以上' → 2
  durationNote: string | null // '初回契約1ヶ月' etc.
  extensionPossible: boolean | null
  requiredLanguages: { language: 'ja' | 'en' | 'zh' | 'ko' | 'other'; note: string }[]
  requiredLicenses: string[] // '運転免許（AT限定可）'
  requiredExperience: string | null
  foreignerSignals: string[] // verbatim: '外国人歓迎', '多国籍…'

  // ---- layer 2: financial ----
  wageType: 'hourly' | 'daily' | 'monthly' | null // classification field
  wageMinJpy: number | null
  wageMaxJpy: number | null
  overtimeNote: string | null // '時間外25%UP', '22時以降1,438円'
  statedMonthlyIncomeJpy: number | null // 予想月収 — site-stated ONLY
  incomeExamples: { label: string; minJpy: number; maxJpy: number }[]
  // 月収例 19〜23万 / 閑散期 16〜20万
  dormFeeJpy: number | null // 0 = explicitly free
  dormFeeNote: string | null // '寮費補助' when amount unstated
  utilitiesFeeJpy: number | null // 0 = '水道光熱費0円'
  utilitiesFeeNote: string | null
  mealsCostType: 'free' | 'paid' | 'partial' | 'not_provided' | null
  mealsCostNote: string | null // '1食¥500', '昼夜休日含め無料'
  travelReimbursement: 'full' | 'capped' | 'none' | null
  travelReimbursementCapJpy: number | null
  travelReimbursementCondition: string | null // '満了時に支給' ← trap field
  payDay: string | null // '月末締め翌月20日'
  advancePayAvailable: boolean | null // 前払い/週払い
  completionBonusNote: string | null // 満了金

  // ---- layer 3: living ----
  housingType: 'private_room' | 'shared_room' | 'none' | null
  housingWifi: boolean | null
  housingNote: string | null // '共用トイレ・洗濯機' etc, ≤80 chars
  mealsProvidedNote: string | null // '従業員食堂/弁当/ビュッフェ賄い'
  prefecture: string | null // '山梨県'
  cityArea: string | null // '南小国町', '銀座'
  areaName: string | null // '黒川温泉', '定山渓' (resort-area name)
  accessNote: string | null // '銀座駅徒歩2分', 'コンビニまで車5分', '山奥'
  carAllowed: boolean | null // 車持ち込み可
  onsenUse: boolean | null // 温泉利用OK

  // ---- layer 4: work ----
  shiftType: 'through' | 'split' | 'rotating' | null // 通し/中抜け/シフト制
  hoursNote: string | null // '8:00〜21:30の中で実働8h'
  nightWork: boolean | null // ナイトフロント / 22時以降勤務
  overtimeEstimate: string | null // '日0〜2時間', '残業月20時間以内'
  holidaysPerMonthNote: string | null // '月6〜8日', '月4日以上' (keep string)
  trainingSupport: boolean | null // 研修制度あり
  sourceRatingScore: number | null // dive: 総合評価 3.8
  sourceRatingCount: number | null // (7件)

  // ---- cross-cutting ----
  redFlags: string[] // verbatim unusual conditions
  evidence: Record<string, string> // fieldName → ≤50-char verbatim quote
}

/** Classification fields: enum assignment is allowed without an evidence quote. */
export const EXTRACTION_CLASSIFICATION_FIELDS = [
  'roleCategory',
  'employmentType',
  'wageType',
  'mealsCostType',
  'travelReimbursement',
  'housingType',
  'shiftType',
] as const

export type ExtractionClassificationField =
  (typeof EXTRACTION_CLASSIFICATION_FIELDS)[number]
