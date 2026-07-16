import type { JobExtraction } from '@/types/extraction'
import type { SearchMission } from './types'

export type MissionJob = {
  title?: string
  location?: string
  rawText?: string
  extraction?: JobExtraction | null
}

export type MissionDecisionStatus = 'apply' | 'confirm' | 'not_recommended'
export type MissionReasonKind = 'positive' | 'tradeoff' | 'blocker' | 'unknown'
export type MissionReasonCode =
  | 'region_match'
  | 'region_tradeoff'
  | 'keyword_match'
  | 'no_extraction'
  | 'income_unknown'
  | 'income_below'
  | 'income_meets'
  | 'dorm_unknown'
  | 'dorm_above'
  | 'dorm_meets'
  | 'private_room_unknown'
  | 'private_room_missing'
  | 'private_room_confirmed'
  | 'live_in_unknown'
  | 'live_in_missing'
  | 'live_in_confirmed'
  | 'shift_unknown'
  | 'split_shift_blocked'
  | 'night_unknown'
  | 'night_work_blocked'
  | 'duration_unknown'
  | 'duration_too_long'
  | 'tradeoff'
  | 'not_enough_information'
export type MissionReason = {
  kind: MissionReasonKind
  code: MissionReasonCode
  values?: string[]
}

export type MissionDecision = {
  status: MissionDecisionStatus
  reasons: MissionReason[]
  route: 'agency' | 'unknown'
}

function listingText(job: MissionJob): string {
  const extraction = job.extraction
  return [
    job.title,
    job.location,
    job.rawText,
    extraction?.workplaceName,
    extraction?.dutySummary,
    extraction?.areaName,
    extraction?.cityArea,
    extraction?.prefecture,
    extraction?.housingNote,
    extraction?.accessNote,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLocaleLowerCase()
}

function includesAny(text: string, terms: string[]): string[] {
  return terms.filter((term) => term.trim().length > 1 && text.includes(term.trim().toLocaleLowerCase()))
}

function monthlyIncome(extraction: JobExtraction): number | null {
  return extraction.statedMonthlyIncomeJpy ?? (extraction.wageType === 'monthly' ? extraction.wageMinJpy : null)
}

export function inferApplicationRoute(job: MissionJob): 'agency' | 'unknown' {
  const extraction = job.extraction
  if (extraction?.agencyName || extraction?.employmentType === 'haken' || extraction?.employmentType === 'shoukai') {
    return 'agency'
  }
  return /派遣|紹介予定|職業紹介|人材紹介/.test(job.rawText ?? '') ? 'agency' : 'unknown'
}

/**
 * A transparent supplement to the existing Fit Score. It never turns free-form
 * preferences into hidden scoring weights; it only blocks explicit structured
 * constraints and surfaces confirmed matches, tradeoffs, and unknowns.
 */
export function evaluateJobForMission(job: MissionJob, mission: SearchMission): MissionDecision {
  const reasons: MissionReason[] = []
  const extraction = job.extraction
  const text = listingText(job)
  const constraints = mission.constraints
  let blocked = false
  let needsConfirmation = false

  const add = (kind: MissionReasonKind, code: MissionReasonCode, values?: string[]) => reasons.push({ kind, code, values })
  const block = (code: MissionReasonCode) => {
    blocked = true
    add('blocker', code)
  }
  const confirm = (code: MissionReasonCode) => {
    needsConfirmation = true
    add('unknown', code)
  }

  const regionMatches = includesAny(text, mission.targetRegions)
  if (regionMatches.length > 0) add('positive', 'region_match', regionMatches.slice(0, 2))
  else if (mission.targetRegions.length > 0 && (job.location || extraction?.areaName || extraction?.prefecture)) {
    add('tradeoff', 'region_tradeoff')
  }

  const keywordMatches = includesAny(text, mission.matchKeywords)
  if (keywordMatches.length > 0) add('positive', 'keyword_match', keywordMatches.slice(0, 3))

  if (!extraction) {
    confirm('no_extraction')
  } else {
    const income = monthlyIncome(extraction)
    if (constraints.minimumMonthlyIncomeJpy !== null) {
      if (income === null) confirm('income_unknown')
      else if (income < constraints.minimumMonthlyIncomeJpy) block('income_below')
      else add('positive', 'income_meets')
    }

    if (constraints.maximumDormFeeJpy !== null) {
      if (extraction.dormFeeJpy === null) confirm('dorm_unknown')
      else if (extraction.dormFeeJpy > constraints.maximumDormFeeJpy) block('dorm_above')
      else add('positive', 'dorm_meets')
    }

    if (constraints.privateRoomRequired === true) {
      if (extraction.housingType === null) confirm('private_room_unknown')
      else if (extraction.housingType !== 'private_room') block('private_room_missing')
      else add('positive', 'private_room_confirmed')
    }

    if (constraints.liveInRequired === true) {
      if (extraction.housingType === null) confirm('live_in_unknown')
      else if (extraction.housingType === 'none') block('live_in_missing')
      else add('positive', 'live_in_confirmed')
    }

    if (constraints.splitShiftAccepted === false) {
      if (extraction.shiftType === null) confirm('shift_unknown')
      else if (extraction.shiftType === 'split') block('split_shift_blocked')
    }

    if (constraints.nightWorkAccepted === false) {
      if (extraction.nightWork === null) confirm('night_unknown')
      else if (extraction.nightWork) block('night_work_blocked')
    }

    if (constraints.maximumDurationMonths !== null) {
      if (extraction.minDurationMonths === null) confirm('duration_unknown')
      else if (extraction.minDurationMonths > constraints.maximumDurationMonths) block('duration_too_long')
    }
  }

  mission.tradeoffs.slice(0, 2).forEach((tradeoff) => {
    if (tradeoff.condition.trim() && tradeoff.acceptableWhen.trim()) {
      add('tradeoff', 'tradeoff', [tradeoff.condition.trim(), tradeoff.acceptableWhen.trim()])
    }
  })

  if (reasons.length === 0) confirm('not_enough_information')

  return {
    status: blocked ? 'not_recommended' : needsConfirmation ? 'confirm' : 'apply',
    reasons: reasons.slice(0, 6),
    route: inferApplicationRoute(job),
  }
}
