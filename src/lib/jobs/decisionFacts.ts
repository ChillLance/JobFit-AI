import type { AppLanguage } from '@/lib/appLanguage'
import type { JobExtraction } from '@/types/extraction'

// Shared decision-fact formatting for the dashboard card and job detail page.
// `housingType` / `mealsCostType` / `shiftType` are classification fields
// (LLM-assigned enums, not verbatim quotes — see docs/JOB_EXTRACTION_DESIGN.md
// §4), so they render in the app's own language. The *Note fallbacks
// (dormFeeNote / mealsCostNote / hoursNote) are genuine source-language quotes
// and stay untranslated on purpose.

export function formatYen(value: number): string {
  return `¥${value.toLocaleString('en-US')}`
}

const PAY_LABEL: Record<AppLanguage, { monthly: string; hourly: string }> = {
  'zh-TW': { monthly: '月收', hourly: '時薪' },
  en: { monthly: 'Monthly', hourly: 'Hourly' },
  ja: { monthly: '月収', hourly: '時給' },
}

const HOUSING_TYPE_LABEL: Record<
  AppLanguage,
  Record<'private_room' | 'shared_room' | 'none', string>
> = {
  'zh-TW': { private_room: '個人房', shared_room: '共用房', none: '不提供住宿' },
  en: { private_room: 'Private room', shared_room: 'Shared room', none: 'No housing' },
  ja: { private_room: '個室', shared_room: '相部屋', none: '住居提供なし' },
}

const DORM_FREE_LABEL: Record<AppLanguage, string> = {
  'zh-TW': '寮費全免',
  en: 'Free dorm',
  ja: '寮費無料',
}

const DORM_FEE_PREFIX: Record<AppLanguage, string> = {
  'zh-TW': '寮費',
  en: 'Dorm fee',
  ja: '寮費',
}

const MEALS_COST_LABEL: Record<
  AppLanguage,
  Record<'free' | 'paid' | 'partial' | 'not_provided', string>
> = {
  'zh-TW': {
    free: '餐食全免',
    paid: '需自費',
    partial: '部分供餐',
    not_provided: '不供餐',
  },
  en: {
    free: 'Free',
    paid: 'Paid',
    partial: 'Partially covered',
    not_provided: 'Not provided',
  },
  ja: { free: '無料', paid: '有料', partial: '一部支給', not_provided: '提供なし' },
}

const SHIFT_TYPE_LABEL: Record<
  AppLanguage,
  Record<'split' | 'through' | 'rotating', string>
> = {
  'zh-TW': { split: '拆班（早晚分開）', through: '整段排班', rotating: '輪班制' },
  en: { split: 'Split shift', through: 'Through shift', rotating: 'Rotating shift' },
  ja: { split: '中抜け', through: '通し勤務', rotating: 'シフト制' },
}

const DURATION_LABEL: Record<AppLanguage, (months: number) => string> = {
  'zh-TW': (months) => `最短 ${months} 個月`,
  en: (months) => `${months}+ months`,
  ja: (months) => `最短 ${months}ヶ月`,
}

export function getPayFact(extraction: JobExtraction, language: AppLanguage): string | null {
  const label = PAY_LABEL[language]
  if (extraction.statedMonthlyIncomeJpy) {
    return `${label.monthly} ${formatYen(extraction.statedMonthlyIncomeJpy)}`
  }
  if (extraction.wageMinJpy) {
    return extraction.wageMaxJpy && extraction.wageMaxJpy !== extraction.wageMinJpy
      ? `${label.hourly} ${formatYen(extraction.wageMinJpy)}–${formatYen(extraction.wageMaxJpy)}`
      : `${label.hourly} ${formatYen(extraction.wageMinJpy)}`
  }
  return null
}

export function getHousingFact(extraction: JobExtraction, language: AppLanguage): string | null {
  const housingLabel = extraction.housingType
    ? HOUSING_TYPE_LABEL[language][extraction.housingType]
    : null

  const dormLabel =
    extraction.dormFeeJpy === 0
      ? DORM_FREE_LABEL[language]
      : extraction.dormFeeJpy !== null
        ? `${DORM_FEE_PREFIX[language]} ${formatYen(extraction.dormFeeJpy)}`
        : extraction.dormFeeNote

  return [housingLabel, dormLabel].filter(Boolean).join(' · ') || null
}

export function getMealsFact(extraction: JobExtraction, language: AppLanguage): string | null {
  if (extraction.mealsCostType) return MEALS_COST_LABEL[language][extraction.mealsCostType]
  return extraction.mealsCostNote || null
}

export function getShiftFact(extraction: JobExtraction, language: AppLanguage): string | null {
  if (extraction.shiftType) return SHIFT_TYPE_LABEL[language][extraction.shiftType]
  return extraction.hoursNote || null
}

export function getDurationFact(extraction: JobExtraction, language: AppLanguage): string | null {
  if (extraction.minDurationMonths === null) return null
  return DURATION_LABEL[language](extraction.minDurationMonths)
}

export type DecisionFact = { label: string; value: string }

export type DecisionFactCopy = {
  pay: string
  housing: string
  meals: string
  shift: string
  duration: string
}

export function getDecisionFacts(
  extraction: JobExtraction | null | undefined,
  copy: DecisionFactCopy,
  language: AppLanguage
): DecisionFact[] {
  if (!extraction) return []

  const entries: [string, string | null][] = [
    [copy.pay, getPayFact(extraction, language)],
    [copy.housing, getHousingFact(extraction, language)],
    [copy.meals, getMealsFact(extraction, language)],
    [copy.shift, getShiftFact(extraction, language)],
    [copy.duration, getDurationFact(extraction, language)],
  ]

  return entries
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => ({ label, value }))
}

const MISSING_FIELD_FALLBACK_LABEL: Record<
  AppLanguage,
  { utilities: string; travel: string; daysOff: string; japaneseRequirement: string }
> = {
  'zh-TW': {
    utilities: '水電瓦斯',
    travel: '交通補助',
    daysOff: '每月休假日',
    japaneseRequirement: '日語需求',
  },
  en: {
    utilities: 'utilities',
    travel: 'travel reimbursement',
    daysOff: 'days off',
    japaneseRequirement: 'Japanese requirement',
  },
  ja: {
    utilities: '水道光熱費',
    travel: '交通費支給',
    daysOff: '月間休日',
    japaneseRequirement: '日本語要件',
  },
}

const CRITICAL_MISSING_CHECKS: ((extraction: JobExtraction) => boolean)[] = [
  (e) => e.dormFeeJpy === null && !e.dormFeeNote,
  (e) => e.utilitiesFeeJpy === null && !e.utilitiesFeeNote,
  (e) => e.mealsCostType === null,
  (e) => e.housingType === null,
  (e) => e.minDurationMonths === null,
  (e) => e.travelReimbursement === null,
  (e) => e.holidaysPerMonthNote === null,
  (e) => e.requiredLanguages.length === 0,
]

export function getMissingConditionLabels(
  extraction: JobExtraction,
  labels: { housing: string; meals: string; shift: string; duration: string },
  language: AppLanguage
): string[] {
  const extra = MISSING_FIELD_FALLBACK_LABEL[language]
  const labelByCheckIndex = [
    labels.housing,
    extra.utilities,
    labels.meals,
    labels.housing,
    labels.duration,
    extra.travel,
    extra.daysOff,
    extra.japaneseRequirement,
  ]

  return CRITICAL_MISSING_CHECKS.map((check, index) =>
    check(extraction) ? labelByCheckIndex[index] : null
  ).filter((value): value is string => Boolean(value))
}

export function getCriticalMissingCount(extraction: JobExtraction | null | undefined): number {
  if (!extraction) return 0
  return CRITICAL_MISSING_CHECKS.filter((check) => check(extraction)).length
}
