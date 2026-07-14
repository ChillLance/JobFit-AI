/**
 * Profile-driven local job analysis (TASK-029).
 *
 * Replaces the previous hard-coded candidate assumptions: scoring is now driven
 * by the active `JapanCareerProfile` (locations, roles, keywords, employment
 * types, salary, Japanese level, visa needs, deal breakers, and work-style
 * tolerances). Matching is intentionally simple keyword/substring matching —
 * not real NLP — so it stays predictable and dependency-free.
 *
 * This module is pure (no fs / no network) so it can be reused from any server
 * route. The returned object is compatible with `normalizeAnalysisResult`.
 */

import type {
  JapanCareerProfile,
  ToleranceLevel,
} from '@/lib/profile'
import { getFitLevel } from './normalizeAnalysis'
import { estimateMonthlySavings } from '@/lib/jobs/savings'
import type { AnalysisResult, FitLevel } from '@/types/analysis'
import type { JobExtraction } from '@/types/extraction'

export type LocalAnalyzableJob = {
  id: string
  title?: string
  company?: string
  location?: string
  employmentType?: string
  salary?: string
  rawText?: string
  description?: string
  // Structured LLM extraction (present for some jobs — see
  // src/types/extraction.ts). Optional and read-only here: when absent, every
  // extraction-driven rule below is skipped and scoring behaves exactly as it
  // did before extraction existed (regression-safe for jobs without it).
  extraction?: JobExtraction | null
}

export type LocalAnalysisResult = AnalysisResult & {
  jobId: string
  source: 'local-profile'
  analysisVersion: 2
  recommendedAction: 'apply' | 'maybe' | 'skip'
}

function clampScore(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)))
}

function buildJobText(job: LocalAnalyzableJob): string {
  return [
    job.title,
    job.company,
    job.location,
    job.employmentType,
    job.salary,
    job.rawText,
    job.description,
  ]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join('\n')
}

// Case-insensitive "does the haystack contain this needle" (handles ASCII and
// Japanese alike; Japanese is unaffected by lowercasing).
function contains(haystackLower: string, needle: string): boolean {
  const n = needle.trim().toLowerCase()
  return n.length > 0 && haystackLower.includes(n)
}

function matchedFrom(haystackLower: string, needles: string[]): string[] {
  return uniq(needles.filter((n) => contains(haystackLower, n)))
}

// Significant tokens of a (possibly multi-word) role/phrase, dropping very
// short/stop-like fragments so we don't match on "a" / "of".
function significantTokens(phrase: string): string[] {
  return phrase
    .split(/[\s/、,，・]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
}

// True when the phrase (or one of its significant tokens) appears in the text.
function phraseOrTokenMatch(haystackLower: string, phrase: string): boolean {
  if (contains(haystackLower, phrase)) return true
  // For multi-token English phrases, require at least one meaningful token.
  const tokens = significantTokens(phrase)
  if (tokens.length <= 1) return false
  return tokens.some((t) => t.length >= 4 && contains(haystackLower, t))
}

// ---------------------------------------------------------------------------
// Japanese level ranking (rough, practical)
// ---------------------------------------------------------------------------

function japaneseLevelRank(text: string): number {
  const t = text.toLowerCase()
  if (/ネイティブ|native|母語/.test(text)) return 6
  if (/n1|ｎ１|ビジネスレベル日本語|ビジネス日本語/.test(t)) return 5
  if (/n2|ｎ２/.test(t)) return 4
  if (/n3|ｎ３/.test(t)) return 3
  if (/n4|ｎ４/.test(t)) return 2
  if (/n5|ｎ５/.test(t)) return 1
  if (/ビジネス|business/.test(t)) return 4
  if (/日常会話|conversational|日常溝通/.test(t)) return 2
  return 0
}

// Detect the highest Japanese level the job explicitly requires.
function detectRequiredJapaneseRank(jobTextLower: string): number {
  let rank = 0
  if (/ネイティブレベル|native japanese|ネイティブ/.test(jobTextLower))
    rank = Math.max(rank, 6)
  if (/n1|ｎ１|ビジネスレベル日本語|ビジネス日本語/.test(jobTextLower))
    rank = Math.max(rank, 5)
  if (/n2|ｎ２/.test(jobTextLower)) rank = Math.max(rank, 4)
  if (/n3|ｎ３/.test(jobTextLower)) rank = Math.max(rank, 3)
  return rank
}

// ---------------------------------------------------------------------------
// Salary parsing (simple, JPY only)
// ---------------------------------------------------------------------------

// Extract a rough monthly and annual JPY figure from free text. Handles the
// common "万" (10,000) shorthand. Returns null when nothing is parseable.
function parseSalary(text: string): { monthly: number | null; annual: number | null } {
  let monthly: number | null = null
  let annual: number | null = null

  // 年収 / 年俸 … 400万, 4,000,000
  const annualMatch =
    text.match(/(?:年収|年俸|annual)[^0-9]{0,6}([0-9,]+)\s*万/) ||
    text.match(/(?:年収|年俸|annual)[^0-9]{0,6}([0-9,]{4,})/)
  if (annualMatch) {
    const num = Number(annualMatch[1].replace(/,/g, ''))
    if (Number.isFinite(num)) {
      annual = /万/.test(annualMatch[0]) ? num * 10000 : num
    }
  }

  // 月給 / 月収 … 25万, 250,000
  const monthlyMatch =
    text.match(/(?:月給|月収|monthly)[^0-9]{0,6}([0-9,]+)\s*万/) ||
    text.match(/(?:月給|月収|monthly)[^0-9]{0,6}([0-9,]{4,})/)
  if (monthlyMatch) {
    const num = Number(monthlyMatch[1].replace(/,/g, ''))
    if (Number.isFinite(num)) {
      monthly = /万/.test(monthlyMatch[0]) ? num * 10000 : num
    }
  }

  return { monthly, annual }
}

// ---------------------------------------------------------------------------
// Work-style tolerance handling
// ---------------------------------------------------------------------------

type ToleranceOutcome = { penalty: number; risk?: string }

function toleranceOutcome(
  level: ToleranceLevel,
  conditionLabel: string
): ToleranceOutcome {
  switch (level) {
    case 'avoid':
      return {
        penalty: 14,
        risk: `職缺包含${conditionLabel}，但你的設定為「想避免」，建議謹慎評估或跳過。`,
      }
    case 'low':
      return {
        penalty: 7,
        risk: `職缺包含${conditionLabel}，你的接受度偏低，建議確認頻率與實際安排。`,
      }
    case 'medium':
      return {
        penalty: 2,
        risk: `職缺包含${conditionLabel}，請確認是否在可接受範圍內。`,
      }
    default:
      return { penalty: 0 }
  }
}

function recommendationLabel(action: 'apply' | 'maybe' | 'skip'): string {
  switch (action) {
    case 'apply':
      return '建議投遞'
    case 'skip':
      return '暫不建議'
    default:
      return '可以考慮'
  }
}

// Detect a concrete employment type token in the job text.
const EMPLOYMENT_TYPE_TOKENS: { token: string; label: string }[] = [
  { token: '正社員', label: '正社員' },
  { token: '契約社員', label: '契約社員' },
  { token: '派遣', label: '派遣' },
  { token: 'アルバイト', label: 'アルバイト' },
  { token: 'パート', label: 'パート' },
  { token: '業務委託', label: '業務委託' },
  { token: 'full-time', label: 'full-time' },
  { token: 'part-time', label: 'part-time' },
  { token: 'contract', label: 'contract' },
]

/**
 * Analyze a single job against the active career profile using simple keyword
 * matching. Returns a result compatible with `normalizeAnalysisResult`.
 */
export function analyzeJobLocally(
  job: LocalAnalyzableJob,
  profile: JapanCareerProfile
): LocalAnalysisResult {
  const jobText = buildJobText(job)
  const jobTextLower = jobText.toLowerCase()
  const locationText = `${job.location ?? ''}\n${jobText}`.toLowerCase()

  const strengths: string[] = []
  const gaps: string[] = []
  const risks: string[] = []
  const suggestedActions: string[] = []

  let score = 50

  // 1. Location -----------------------------------------------------------
  const desiredLocations = profile.target.desiredLocations ?? []
  const genericLocations = ['japan', '日本', 'remote', '遠端', 'リモート', 'anywhere']
  const matchedLocations = matchedFrom(locationText, desiredLocations)
  const hasGenericLocation = desiredLocations.some((l) =>
    genericLocations.includes(l.trim().toLowerCase())
  )
  if (matchedLocations.length > 0) {
    score += 12
    strengths.push(`工作地點符合你的期望地點（${matchedLocations.join('、')}）。`)
  } else if (
    job.location &&
    desiredLocations.length > 0 &&
    !hasGenericLocation
  ) {
    score -= 6
    gaps.push(
      `職缺地點「${job.location}」未對應到你的期望地點（${desiredLocations.join('、')}），請確認通勤或搬遷可行性。`
    )
  }

  // 2. Roles / keywords / industries -------------------------------------
  const matchedRoles = uniq(
    (profile.target.desiredRoles ?? []).filter((r) =>
      phraseOrTokenMatch(jobTextLower, r)
    )
  )
  const matchedKeywords = matchedFrom(
    jobTextLower,
    profile.target.preferredKeywords ?? []
  )
  const matchedIndustries = uniq(
    (profile.target.industries ?? []).filter((i) =>
      phraseOrTokenMatch(jobTextLower, i)
    )
  )

  const roleKeywordHits = matchedRoles.length + matchedKeywords.length
  if (roleKeywordHits > 0) {
    score += Math.min(roleKeywordHits * 4, 18)
    const shown = uniq([...matchedRoles, ...matchedKeywords]).slice(0, 6)
    strengths.push(`職缺與你的期望職種／關鍵字相符（${shown.join('、')}）。`)
  } else {
    gaps.push('職缺內容未明顯對應到你的期望職種或關鍵字，請確認實際工作內容。')
  }
  if (matchedIndustries.length > 0) {
    score += 6
    strengths.push(`屬於你的目標產業（${matchedIndustries.join('、')}）。`)
  }

  // 3. Employment type ----------------------------------------------------
  const acceptable = profile.conditions.acceptableEmploymentTypes ?? []
  const acceptableLower = acceptable.map((t) => t.trim().toLowerCase())
  const detectedType = EMPLOYMENT_TYPE_TOKENS.find(({ token }) =>
    contains(jobTextLower, token)
  )
  if (detectedType && acceptable.length > 0) {
    const ok = acceptableLower.some(
      (a) =>
        a === detectedType.label.toLowerCase() ||
        a.includes(detectedType.label.toLowerCase()) ||
        detectedType.label.toLowerCase().includes(a)
    )
    if (ok) {
      score += 4
      strengths.push(`雇用形態「${detectedType.label}」在你可接受的範圍內。`)
    } else {
      score -= 10
      risks.push(
        `雇用形態「${detectedType.label}」不在你可接受的清單（${acceptable.join('、')}）內。`
      )
    }
  }

  // 4. Salary -------------------------------------------------------------
  const { minimumMonthlySalary, minimumAnnualSalary } = profile.conditions
  const parsedSalary = parseSalary(jobText)
  if (
    typeof minimumMonthlySalary === 'number' &&
    parsedSalary.monthly !== null &&
    parsedSalary.monthly < minimumMonthlySalary
  ) {
    score -= 10
    risks.push(
      `推估月薪約 ${parsedSalary.monthly.toLocaleString('en-US')} 日圓，低於你的期望（${minimumMonthlySalary.toLocaleString('en-US')} 日圓）。`
    )
  }
  if (
    typeof minimumAnnualSalary === 'number' &&
    parsedSalary.annual !== null &&
    parsedSalary.annual < minimumAnnualSalary
  ) {
    score -= 10
    risks.push(
      `推估年薪約 ${parsedSalary.annual.toLocaleString('en-US')} 日圓，低於你的期望（${minimumAnnualSalary.toLocaleString('en-US')} 日圓）。`
    )
  }

  // 5. Japanese level -----------------------------------------------------
  const requiredJpRank = detectRequiredJapaneseRank(jobTextLower)
  const profileJpRank = japaneseLevelRank(profile.languages.japaneseLevel ?? '')
  if (requiredJpRank > 0 && profileJpRank > 0 && requiredJpRank > profileJpRank) {
    score -= 8
    gaps.push(
      `職缺要求的日文程度可能高於你目前的「${profile.languages.japaneseLevel}」，建議準備具體情境說明日文使用能力。`
    )
  }

  // 6. Visa ---------------------------------------------------------------
  const jobMentionsVisa = /ビザ|visa|sponsor|在留資格|就労資格|ビザサポート/i.test(
    jobText
  )
  if (profile.visa.needsVisaSupport) {
    if (jobMentionsVisa) {
      score += 4
      strengths.push('職缺提及簽證／在留資格相關內容，建議確認是否提供簽證支援。')
    } else {
      suggestedActions.push(
        '你需要簽證支援，但職缺未提及簽證資訊，建議主動向雇主確認是否提供簽證支援。'
      )
    }
  }

  // 7. Deal breakers / risks to avoid (substring matching) ----------------
  const dealBreakerHits = matchedFrom(
    jobTextLower,
    profile.preferences.dealBreakers ?? []
  )
  for (const hit of dealBreakerHits.slice(0, 2)) {
    score -= 20
    risks.push(`職缺可能觸及你的絕對地雷：${hit}。`)
  }
  const riskAvoidHits = matchedFrom(
    jobTextLower,
    profile.preferences.risksToAvoid ?? []
  )
  for (const hit of riskAvoidHits.slice(0, 3)) {
    score -= 6
    risks.push(`職缺可能包含你想避免的情況：${hit}。`)
  }

  // 8. Work-style tolerances ---------------------------------------------
  const styleConditions: {
    detected: boolean
    level: ToleranceLevel
    label: string
  }[] = [
    {
      // extraction.nightWork (when the LLM extraction explicitly classified
      // the listing as night work) reinforces the text-based regex detection
      // rather than adding a separate scoring path.
      detected:
        /夜勤|ナイトフロント|night shift|深夜/.test(jobText) ||
        job.extraction?.nightWork === true,
      level: profile.conditions.nightShiftTolerance,
      label: '夜班',
    },
    {
      detected: /固定残業|残業|時間外|overtime/.test(jobText),
      level: profile.conditions.overtimeTolerance,
      label: '加班',
    },
    {
      detected: /シフト制|シフト勤務|交替勤務|shift work/.test(jobText),
      level: profile.conditions.shiftWorkTolerance,
      label: '輪班',
    },
    {
      detected: /転勤|転居|relocation|transfer/.test(jobText),
      level: profile.conditions.transferTolerance,
      label: '轉勤調動',
    },
  ]
  for (const cond of styleConditions) {
    if (!cond.detected) continue
    const outcome = toleranceOutcome(cond.level, cond.label)
    score -= outcome.penalty
    if (outcome.risk) risks.push(outcome.risk)
  }

  // 9. Financial visibility from extraction (TASK-030 follow-up) ----------
  // Local rules previously had no visibility into extraction.dormFeeJpy /
  // mealsCostType / utilitiesFeeJpy, so a job with fully-covered housing and
  // meals scored the same as one with none of that — the "financial blind
  // spot". These rules are independent of the profile: they fire whenever
  // extraction says so, regardless of who is being scored.
  const extraction = job.extraction
  if (extraction) {
    let financialBonus = 0
    if (extraction.dormFeeJpy === 0) {
      financialBonus += 4
      strengths.push('寮費0円——住宿成本全免。')
    }
    if (extraction.mealsCostType === 'free') {
      financialBonus += 4
      strengths.push('餐食全免，可再省下一筆生活支出。')
    }
    if (extraction.utilitiesFeeJpy === 0) {
      financialBonus += 2
      strengths.push('水道光熱費0円，進一步降低生活成本。')
    }
    score += Math.min(financialBonus, 10)

    if (
      typeof extraction.travelReimbursementCondition === 'string' &&
      extraction.travelReimbursementCondition.includes('満了')
    ) {
      risks.push('交通費採滿約後支付——中途離職拿不到。')
    }

    // 10. Profile cross-reference (only fires when both extraction AND the
    // profile's workingHoliday settings have a concrete value) -------------
    const wh = profile.workingHoliday
    if (wh) {
      if (extraction.requiredLicenses.some((lic) => lic.includes('免許'))) {
        if (wh.hasDriverLicense === false) {
          score -= 15
          risks.push('職缺要求駕照，但你的設定為沒有駕照，請確認是否仍可應徵。')
        } else if (wh.hasDriverLicense === true) {
          score += 3
          strengths.push('職缺要求駕照，你符合這項條件。')
        }
      }

      if (extraction.shiftType === 'split') {
        if (
          wh.splitShiftTolerance === 'avoid' ||
          wh.splitShiftTolerance === 'low'
        ) {
          score -= 6
          risks.push(
            '職缺為中抜けシフト（排班中段有空班），但你的接受度偏低，請確認實際排班安排。'
          )
        } else if (
          wh.splitShiftTolerance === 'high' ||
          wh.splitShiftTolerance === 'flexible'
        ) {
          score += 2
          strengths.push('職缺為中抜けシフト，符合你可接受的排班彈性。')
        }
      }

      if (
        extraction.minDurationMonths !== null &&
        wh.availableMonths !== null &&
        extraction.minDurationMonths > wh.availableMonths
      ) {
        score -= 15
        risks.push(
          `最短勤務期間超過你可工作的月數（職缺要求至少 ${extraction.minDurationMonths} 個月，你最長可工作 ${wh.availableMonths} 個月）。`
        )
      }

      if (wh.targetMonthlySavingsJpy !== null) {
        const savings = estimateMonthlySavings(job)
        if (savings !== null) {
          const targetLabel = wh.targetMonthlySavingsJpy.toLocaleString('en-US')
          const savingsLabel = savings.savingsJpy.toLocaleString('en-US')
          if (savings.savingsJpy >= wh.targetMonthlySavingsJpy) {
            score += 4
            strengths.push(
              `預估每月可存約 ¥${savingsLabel}，達到你設定的存錢目標（¥${targetLabel}）。`
            )
          } else {
            risks.push(
              `預估每月可存約 ¥${savingsLabel}，低於你設定的存錢目標（¥${targetLabel}）。`
            )
          }
        }
      }
    }
  }

  // ---- Finalize ---------------------------------------------------------
  score = clampScore(score)
  const recommendedAction: 'apply' | 'maybe' | 'skip' =
    score >= 75 ? 'apply' : score >= 50 ? 'maybe' : 'skip'
  const recommendation = recommendationLabel(recommendedAction)
  const fitLevel: FitLevel = getFitLevel(score)

  // Profile-aware suggested actions.
  if (matchedRoles.length > 0 || matchedKeywords.length > 0) {
    suggestedActions.push(
      `履歷可強調與「${uniq([...matchedRoles, ...matchedKeywords]).slice(0, 3).join('、')}」相關的具體經驗。`
    )
  }
  if (profile.strengths.length > 0) {
    suggestedActions.push(
      `面試時主打你的核心優勢：${profile.strengths.slice(0, 3).join('、')}。`
    )
  }

  const summaryParts: string[] = [
    `依「${profile.name}」這份個人檔案進行本地規則分析，適合度分數為 ${score} 分，目前判定為「${recommendation}」。`,
  ]
  if (strengths.length > 0) {
    summaryParts.push(`主要相符：${strengths[0]}`)
  }
  if (risks.length > 0) {
    summaryParts.push(`需留意：${risks[0]}`)
  }

  const analyzedAt = new Date().toISOString()

  return {
    jobId: job.id,
    source: 'local-profile',
    analysisVersion: 2,
    fitScore: score,
    fitLevel,
    recommendation,
    recommendedAction,
    summary: summaryParts.join(' '),
    strengths: uniq(strengths).slice(0, 12),
    gaps: uniq(gaps).slice(0, 12),
    risks: uniq(risks).slice(0, 12),
    suggestedActions: uniq(suggestedActions).slice(0, 12),
    metadata: {
      provider: 'local',
      model: 'local-rules-v1',
      createdAt: analyzedAt,
      inputMode: 'rules',
      profileVersion: `${profile.id}@${profile.updatedAt}`,
      analyzedProfileId: profile.id,
      analyzedProfileName: profile.name,
      analyzedAt,
    },
  }
}
