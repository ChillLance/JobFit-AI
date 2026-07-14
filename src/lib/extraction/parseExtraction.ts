// Code-side validation for LLM extraction output (design doc §6).
//
// Pure module: no fs, no network. `hashRawText` uses node:crypto only.
//
// Order of operations, fail-closed to `null` (never reject the whole result
// unless the JSON itself is unparseable):
//   1. JSON.parse (strip accidental markdown fences first).
//   2. Enum whitelist per classification field; unknown token → null.
//   3. Type coercion: numbers must be finite integers ≥ 0 (except
//      `sourceRatingScore`, a decimal rating per the schema comment);
//      strings trimmed (empty → null); arrays filtered to well-shaped
//      entries.
//   4. Evidence gate: normalize both rawText and each quote with NFKC
//      (full→half width) + strip whitespace/commas. Quote not a substring
//      of normalized rawText → field forced to null, evidence entry
//      dropped, field name recorded in `demotedFields`.
//   5. Numeric sanity (warn-only, not demote): appended to `warnings`.

import { createHash } from 'node:crypto'
import {
  EXTRACTION_CLASSIFICATION_FIELDS,
  type JobExtraction,
} from '@/types/extraction'

export type ParseExtractionSuccess = {
  ok: true
  extraction: JobExtraction
  demotedFields: string[]
  warnings: string[]
}

export type ParseExtractionFailure = {
  ok: false
  error: 'parse_error'
  details: string
}

export type ParseExtractionResult = ParseExtractionSuccess | ParseExtractionFailure

/** sha256 hex of rawText — used both for `JobExtraction.rawTextHash` and by
 * the collect endpoint to decide whether a stale extraction must be cleared. */
export function hashRawText(rawText: string): string {
  return createHash('sha256').update(rawText, 'utf8').digest('hex')
}

// ---- normalization / matching helpers ----

function normalizeForEvidenceMatch(s: string): string {
  // NFKC folds full-width digits/letters/punctuation (incl. the full-width
  // comma "，") to their standard forms; \s (Unicode-aware) also matches the
  // ideographic space U+3000.
  return s.normalize('NFKC').replace(/[\s,]/g, '')
}

function evidenceMatches(quote: unknown, normalizedRawText: string): quote is string {
  if (typeof quote !== 'string') return false
  const trimmed = quote.trim()
  if (!trimmed) return false
  const normalizedQuote = normalizeForEvidenceMatch(trimmed)
  if (!normalizedQuote) return false
  return normalizedRawText.includes(normalizedQuote)
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenceMatch ? fenceMatch[1].trim() : trimmed
}

// ---- type coercion helpers (step 3) ----

function toTrimmedStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toIntegerOrNull(value: unknown): number | null {
  let n: number
  if (typeof value === 'number') {
    n = value
  } else if (typeof value === 'string' && value.trim()) {
    n = Number(value.replace(/,/g, '').trim())
  } else {
    return null
  }
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null
  return n
}

// sourceRatingScore is a decimal rating (e.g. 3.8), not an integer amount.
function toNonNegativeNumberOrNull(value: unknown): number | null {
  let n: number
  if (typeof value === 'number') {
    n = value
  } else if (typeof value === 'string' && value.trim()) {
    n = Number(value.trim())
  } else {
    return null
  }
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function toEnumOrNull<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== 'string') return null
  return (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function toStringArrayFiltered(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
}

const LANGUAGE_VALUES = ['ja', 'en', 'zh', 'ko', 'other'] as const

function toRequiredLanguagesArray(
  value: unknown
): { language: 'ja' | 'en' | 'zh' | 'ko' | 'other'; note: string }[] {
  if (!Array.isArray(value)) return []
  const result: { language: 'ja' | 'en' | 'zh' | 'ko' | 'other'; note: string }[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const language = toEnumOrNull((item as Record<string, unknown>).language, LANGUAGE_VALUES)
    const note = toTrimmedStringOrNull((item as Record<string, unknown>).note)
    if (!language || note === null) continue
    result.push({ language, note })
  }
  return result
}

function toIncomeExamplesArray(
  value: unknown
): { label: string; minJpy: number; maxJpy: number }[] {
  if (!Array.isArray(value)) return []
  const result: { label: string; minJpy: number; maxJpy: number }[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const label = toTrimmedStringOrNull(record.label)
    const minJpy = toIntegerOrNull(record.minJpy)
    const maxJpy = toIntegerOrNull(record.maxJpy)
    if (label === null || minJpy === null || maxJpy === null) continue
    result.push({ label, minJpy, maxJpy })
  }
  return result
}

function toEvidenceRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    result[key] = trimmed
  }
  return result
}

// ---- enum whitelists (step 2) ----

const ROLE_CATEGORY_VALUES = [
  'front_desk_bell',
  'room_attendant',
  'restaurant_service',
  'kitchen',
  'cleaning_backyard',
  'shop_sales',
  'office_reservation',
  'general_all',
  'night_front',
  'other',
] as const

const EMPLOYMENT_TYPE_VALUES = [
  'haken',
  'contract',
  'fulltime',
  'parttime_baito',
  'shoukai',
  'other',
] as const

const WAGE_TYPE_VALUES = ['hourly', 'daily', 'monthly'] as const
const MEALS_COST_TYPE_VALUES = ['free', 'paid', 'partial', 'not_provided'] as const
const TRAVEL_REIMBURSEMENT_VALUES = ['full', 'capped', 'none'] as const
const HOUSING_TYPE_VALUES = ['private_room', 'shared_room', 'none'] as const
const SHIFT_TYPE_VALUES = ['through', 'split', 'rotating'] as const

// Array fields whose single shared evidence entry (`evidence.<fieldName>`)
// covers the whole array (design doc §4: "Array fields: one quote covering
// the array is enough").
const SHARED_EVIDENCE_ARRAY_FIELDS = [
  'requiredLanguages',
  'requiredLicenses',
  'incomeExamples',
] as const

// Array fields whose entries are themselves verbatim quotes and need no
// separate evidence entry (design doc §4).
const SELF_EVIDENCING_ARRAY_FIELDS = ['foreignerSignals', 'redFlags'] as const

/**
 * Parse and validate one raw LLM text response into a `JobExtraction`.
 * `context.rawText` is the original listing text the quotes are checked
 * against; `context.model` is recorded verbatim in the result.
 */
export function parseExtraction(
  modelOutput: string,
  context: { rawText: string; model: string }
): ParseExtractionResult {
  // Step 1: JSON.parse (strip accidental markdown fences first).
  let parsed: unknown
  try {
    parsed = JSON.parse(stripMarkdownFences(modelOutput))
  } catch (err) {
    return {
      ok: false,
      error: 'parse_error',
      details: err instanceof Error ? err.message : String(err),
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'parse_error', details: 'Parsed value is not a JSON object' }
  }
  const obj = parsed as Record<string, unknown>

  const demotedFields: string[] = []
  const warnings: string[] = []

  // Step 2: enum whitelist (classification fields — no evidence required).
  const roleCategory = toEnumOrNull(obj.roleCategory, ROLE_CATEGORY_VALUES)
  const employmentType = toEnumOrNull(obj.employmentType, EMPLOYMENT_TYPE_VALUES)
  const wageType = toEnumOrNull(obj.wageType, WAGE_TYPE_VALUES)
  const mealsCostType = toEnumOrNull(obj.mealsCostType, MEALS_COST_TYPE_VALUES)
  const travelReimbursement = toEnumOrNull(obj.travelReimbursement, TRAVEL_REIMBURSEMENT_VALUES)
  const housingType = toEnumOrNull(obj.housingType, HOUSING_TYPE_VALUES)
  const shiftType = toEnumOrNull(obj.shiftType, SHIFT_TYPE_VALUES)
  void EXTRACTION_CLASSIFICATION_FIELDS // referenced for maintenance traceability only

  // Step 3: type coercion for everything else.
  const rawEvidence = toEvidenceRecord(obj.evidence)
  const normalizedRawText = normalizeForEvidenceMatch(context.rawText)

  const coerced = {
    workplaceName: toTrimmedStringOrNull(obj.workplaceName),
    agencyName: toTrimmedStringOrNull(obj.agencyName),
    listingId: toTrimmedStringOrNull(obj.listingId),
    dutySummary: toTrimmedStringOrNull(obj.dutySummary),
    startTiming: toTrimmedStringOrNull(obj.startTiming),
    minDurationMonths: toIntegerOrNull(obj.minDurationMonths),
    durationNote: toTrimmedStringOrNull(obj.durationNote),
    extensionPossible: toBooleanOrNull(obj.extensionPossible),
    requiredExperience: toTrimmedStringOrNull(obj.requiredExperience),
    wageMinJpy: toIntegerOrNull(obj.wageMinJpy),
    wageMaxJpy: toIntegerOrNull(obj.wageMaxJpy),
    overtimeNote: toTrimmedStringOrNull(obj.overtimeNote),
    statedMonthlyIncomeJpy: toIntegerOrNull(obj.statedMonthlyIncomeJpy),
    dormFeeJpy: toIntegerOrNull(obj.dormFeeJpy),
    dormFeeNote: toTrimmedStringOrNull(obj.dormFeeNote),
    utilitiesFeeJpy: toIntegerOrNull(obj.utilitiesFeeJpy),
    utilitiesFeeNote: toTrimmedStringOrNull(obj.utilitiesFeeNote),
    mealsCostNote: toTrimmedStringOrNull(obj.mealsCostNote),
    travelReimbursementCapJpy: toIntegerOrNull(obj.travelReimbursementCapJpy),
    travelReimbursementCondition: toTrimmedStringOrNull(obj.travelReimbursementCondition),
    payDay: toTrimmedStringOrNull(obj.payDay),
    advancePayAvailable: toBooleanOrNull(obj.advancePayAvailable),
    completionBonusNote: toTrimmedStringOrNull(obj.completionBonusNote),
    housingWifi: toBooleanOrNull(obj.housingWifi),
    housingNote: toTrimmedStringOrNull(obj.housingNote),
    mealsProvidedNote: toTrimmedStringOrNull(obj.mealsProvidedNote),
    prefecture: toTrimmedStringOrNull(obj.prefecture),
    cityArea: toTrimmedStringOrNull(obj.cityArea),
    areaName: toTrimmedStringOrNull(obj.areaName),
    accessNote: toTrimmedStringOrNull(obj.accessNote),
    carAllowed: toBooleanOrNull(obj.carAllowed),
    onsenUse: toBooleanOrNull(obj.onsenUse),
    hoursNote: toTrimmedStringOrNull(obj.hoursNote),
    nightWork: toBooleanOrNull(obj.nightWork),
    overtimeEstimate: toTrimmedStringOrNull(obj.overtimeEstimate),
    holidaysPerMonthNote: toTrimmedStringOrNull(obj.holidaysPerMonthNote),
    trainingSupport: toBooleanOrNull(obj.trainingSupport),
    sourceRatingScore: toNonNegativeNumberOrNull(obj.sourceRatingScore),
    sourceRatingCount: toIntegerOrNull(obj.sourceRatingCount),
  }

  let requiredLanguages = toRequiredLanguagesArray(obj.requiredLanguages)
  let requiredLicenses = toStringArrayFiltered(obj.requiredLicenses)
  let incomeExamples = toIncomeExamplesArray(obj.incomeExamples)

  let foreignerSignals = toStringArrayFiltered(obj.foreignerSignals)
  let redFlags = toStringArrayFiltered(obj.redFlags)

  // Step 4a: self-evidencing arrays — each entry must itself be a verbatim
  // substring of the (normalized) rawText.
  for (const field of SELF_EVIDENCING_ARRAY_FIELDS) {
    const before = field === 'foreignerSignals' ? foreignerSignals : redFlags
    const after = before.filter((item) => evidenceMatches(item, normalizedRawText))
    if (after.length !== before.length) demotedFields.push(field)
    if (field === 'foreignerSignals') foreignerSignals = after
    else redFlags = after
  }

  // Step 4b: shared-evidence arrays — one evidence.<fieldName> quote must
  // ground the whole array, otherwise the array is demoted to empty.
  const evidence: Record<string, string> = {}
  for (const field of SHARED_EVIDENCE_ARRAY_FIELDS) {
    const arr =
      field === 'requiredLanguages'
        ? requiredLanguages
        : field === 'requiredLicenses'
          ? requiredLicenses
          : incomeExamples
    if (arr.length === 0) continue
    const quote = rawEvidence[field]
    if (evidenceMatches(quote, normalizedRawText)) {
      evidence[field] = quote.trim()
    } else {
      demotedFields.push(field)
      if (field === 'requiredLanguages') requiredLanguages = []
      else if (field === 'requiredLicenses') requiredLicenses = []
      else incomeExamples = []
    }
  }

  // Step 4c: scalar fields — evidence gate per field.
  const gated: Record<string, unknown> = {}
  for (const [fieldName, value] of Object.entries(coerced)) {
    if (value === null) {
      gated[fieldName] = null
      continue
    }
    const quote = rawEvidence[fieldName]
    if (evidenceMatches(quote, normalizedRawText)) {
      evidence[fieldName] = quote.trim()
      gated[fieldName] = value
    } else {
      demotedFields.push(fieldName)
      gated[fieldName] = null
    }
  }

  // Step 5: numeric sanity (warn-only, not demote).
  const wageMinJpy = gated.wageMinJpy as number | null
  const wageMaxJpy = gated.wageMaxJpy as number | null
  const statedMonthlyIncomeJpy = gated.statedMonthlyIncomeJpy as number | null

  if (wageMinJpy !== null && wageMaxJpy !== null && wageMinJpy > wageMaxJpy) {
    warnings.push(
      `wageMinJpy (${wageMinJpy}) is greater than wageMaxJpy (${wageMaxJpy})`
    )
  }
  if (wageType === 'hourly') {
    for (const [label, v] of [
      ['wageMinJpy', wageMinJpy],
      ['wageMaxJpy', wageMaxJpy],
    ] as const) {
      if (v !== null && (v < 800 || v > 5000)) {
        warnings.push(`hourly ${label} (${v}) is outside the plausible range 800-5000 JPY`)
      }
    }
  }
  if (
    statedMonthlyIncomeJpy !== null &&
    (statedMonthlyIncomeJpy < 100_000 || statedMonthlyIncomeJpy > 1_000_000)
  ) {
    warnings.push(
      `statedMonthlyIncomeJpy (${statedMonthlyIncomeJpy}) is outside the plausible range 100000-1000000 JPY`
    )
  }

  const extraction: JobExtraction = {
    schemaVersion: 1,
    extractedAt: new Date().toISOString(),
    model: context.model,
    rawTextHash: hashRawText(context.rawText),

    workplaceName: gated.workplaceName as string | null,
    agencyName: gated.agencyName as string | null,
    listingId: gated.listingId as string | null,
    roleCategory,
    dutySummary: gated.dutySummary as string | null,

    employmentType,
    startTiming: gated.startTiming as string | null,
    minDurationMonths: gated.minDurationMonths as number | null,
    durationNote: gated.durationNote as string | null,
    extensionPossible: gated.extensionPossible as boolean | null,
    requiredLanguages,
    requiredLicenses,
    requiredExperience: gated.requiredExperience as string | null,
    foreignerSignals,

    wageType,
    wageMinJpy,
    wageMaxJpy,
    overtimeNote: gated.overtimeNote as string | null,
    statedMonthlyIncomeJpy,
    incomeExamples,
    dormFeeJpy: gated.dormFeeJpy as number | null,
    dormFeeNote: gated.dormFeeNote as string | null,
    utilitiesFeeJpy: gated.utilitiesFeeJpy as number | null,
    utilitiesFeeNote: gated.utilitiesFeeNote as string | null,
    mealsCostType,
    mealsCostNote: gated.mealsCostNote as string | null,
    travelReimbursement,
    travelReimbursementCapJpy: gated.travelReimbursementCapJpy as number | null,
    travelReimbursementCondition: gated.travelReimbursementCondition as string | null,
    payDay: gated.payDay as string | null,
    advancePayAvailable: gated.advancePayAvailable as boolean | null,
    completionBonusNote: gated.completionBonusNote as string | null,

    housingType,
    housingWifi: gated.housingWifi as boolean | null,
    housingNote: gated.housingNote as string | null,
    mealsProvidedNote: gated.mealsProvidedNote as string | null,
    prefecture: gated.prefecture as string | null,
    cityArea: gated.cityArea as string | null,
    areaName: gated.areaName as string | null,
    accessNote: gated.accessNote as string | null,
    carAllowed: gated.carAllowed as boolean | null,
    onsenUse: gated.onsenUse as boolean | null,

    shiftType,
    hoursNote: gated.hoursNote as string | null,
    nightWork: gated.nightWork as boolean | null,
    overtimeEstimate: gated.overtimeEstimate as string | null,
    holidaysPerMonthNote: gated.holidaysPerMonthNote as string | null,
    trainingSupport: gated.trainingSupport as boolean | null,
    sourceRatingScore: gated.sourceRatingScore as number | null,
    sourceRatingCount: gated.sourceRatingCount as number | null,

    redFlags,
    evidence,
  }

  return { ok: true, extraction, demotedFields, warnings }
}
