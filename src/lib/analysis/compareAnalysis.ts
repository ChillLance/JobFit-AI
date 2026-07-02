// Model comparison + final recommendation (TASK-022).
// Pure, read-only consolidation of the Local / Gemini / Groq analyses that are
// already stored on a job. This NEVER calls any AI API — it only reads results
// produced by the existing analyze endpoints and reuses normalizeAnalysisResult.

import type { AnalysisResult } from '@/types/analysis'
import {
  PROVIDER_DEFAULT_MODEL,
  normalizeAnalysisResult,
} from '@/lib/analysis/normalizeAnalysis'

export type AnalysisSourceKey = 'local' | 'gemini' | 'groq' | 'openrouter'

export type AnalysisConsistency = 'high' | 'medium' | 'low' | 'insufficient'

export type ConsensusRecommendation =
  | 'strong_apply'
  | 'apply_with_checks'
  | 'consider'
  | 'not_priority'
  | 'insufficient'

export type AnalysisComparison = {
  availableSources: AnalysisSourceKey[]
  scores: {
    local?: number
    gemini?: number
    groq?: number
    openrouter?: number
  }
  averageScore: number | null
  scoreSpread: number | null
  consistency: AnalysisConsistency
  consensusRecommendation: ConsensusRecommendation
  commonStrengths: string[]
  commonRisks: string[]
  commonGaps: string[]
  suggestedChecks: string[]
  finalSummary: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Read the raw provider analysis objects from a loosely-typed job record.
// Local may live under several legacy field names; centralize that here so the
// UI never has to know about provider-specific shapes.
function readRawSources(job: unknown): Record<AnalysisSourceKey, unknown> {
  const j = isRecord(job) ? job : {}

  const local =
    (isRecord(j.localAnalysis) && j.localAnalysis) ||
    (isRecord(j.analysis) && j.analysis) ||
    (isRecord(j.aiScore) && j.aiScore) ||
    null

  return {
    local,
    gemini: isRecord(j.deepAnalysis) ? j.deepAnalysis : null,
    groq: isRecord(j.groqAnalysis) ? j.groqAnalysis : null,
    openrouter: isRecord(j.openrouterAnalysis) ? j.openrouterAnalysis : null,
  }
}

// ---------------------------------------------------------------------------
// Keyword grouping. First version intentionally avoids embeddings / AI: it maps
// free-text strengths / gaps / risks onto a fixed set of Chinese labels.
// ---------------------------------------------------------------------------

type KeywordGroup = {
  label: string
  keywords: string[]
}

const STRENGTH_GROUPS: KeywordGroup[] = [
  {
    label: '地點符合',
    keywords: [
      '福岡',
      '博多',
      '天神',
      '中洲川端',
      '勤務地',
      '地點',
      'location',
    ],
  },
  {
    label: '語言能力匹配',
    keywords: [
      '英語',
      'english',
      '中国語',
      '中文',
      '日本語',
      'n1',
      'n2',
      'jlpt',
      '語言',
      'language',
    ],
  },
  {
    label: '飯店/接客經驗',
    keywords: [
      'ホテル',
      'hotel',
      'フロント',
      '接客',
      '旅客',
      '客服',
      'カスタマーサポート',
      'customer support',
      'guest',
    ],
  },
  {
    label: 'IT/系統適應',
    keywords: ['it', 'システム', 'system', 'pc', 'excel', '數位', 'デジタル', 'iot'],
  },
  {
    label: '薪資/交通條件可接受',
    keywords: [
      '給与',
      '月給',
      '時給',
      'salary',
      '交通費',
      '昇給',
      '賞与',
      '薪資',
    ],
  },
]

const RISK_GROUPS: KeywordGroup[] = [
  {
    label: '夜勤/排班',
    keywords: ['夜勤', 'シフト', '早番', '遅番', '排班', '深夜'],
  },
  {
    label: '加班/固定殘業',
    keywords: ['残業', '固定残業代', '加班', 'overtime', '時間外'],
  },
  {
    label: '契約/非正社員',
    keywords: ['契約社員', '契約更新', '非正社員', '契約', 'contract'],
  },
  {
    label: '派遣',
    keywords: ['派遣'],
  },
  {
    label: '轉勤/地點變動',
    keywords: ['転勤', '調動', 'relocate', 'relocation'],
  },
  {
    label: '語言壓力',
    keywords: ['日本語', 'n2', '電話', '即時', '書寫', '敬語', 'language pressure'],
  },
  {
    label: '簽證不明',
    keywords: ['ビザ', 'visa', '就労資格', '在留資格', 'sponsorship'],
  },
  {
    label: '遠端不明',
    keywords: ['リモート', '在宅', 'remote'],
  },
]

const GAP_GROUPS: KeywordGroup[] = [
  {
    label: '日語即時溝通',
    keywords: ['日本語', 'n2', '電話', '即時', '敬語', '書寫'],
  },
  {
    label: '夜勤適應',
    keywords: ['夜勤', 'シフト', '深夜', '排班'],
  },
  {
    label: '系統/IT操作',
    keywords: ['システム', 'pc', 'it', 'excel', 'ツール'],
  },
  {
    label: '勞動條件確認',
    keywords: ['残業', '固定残業代', '契約', '契約社員', '休日', '休暇'],
  },
  {
    label: '簽證/在留資格確認',
    keywords: ['ビザ', 'visa', '就労資格', '在留資格', 'sponsorship'],
  },
]

// Risk labels that should cap a recommendation at "apply_with_checks".
const HIGH_RISK_LABELS = new Set<string>([
  '夜勤/排班',
  '加班/固定殘業',
  '派遣',
  '契約/非正社員',
  '轉勤/地點變動',
])

const MAX_GROUP_ITEMS = 5
const MAX_RAW_LEN = 80
const MAX_SUGGESTED_CHECKS = 6

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  return t.length > max ? `${t.slice(0, max).trim()}…` : t
}

// Map a pool of free-text items onto fixed group labels. Matched group labels
// come first (in definition order); a few unmatched short snippets are kept as
// a fallback so signal isn't lost. Result is capped at MAX_GROUP_ITEMS.
function groupByKeywords(items: string[], groups: KeywordGroup[]): string[] {
  if (items.length === 0) return []

  const normalized = items.map((item) => ({
    raw: item,
    norm: normalizeText(item),
  }))

  const matchedLabels: string[] = []
  const matchedAnyIndex = new Set<number>()

  for (const group of groups) {
    const hit = normalized.some((entry, index) => {
      const isHit = group.keywords.some((kw) => entry.norm.includes(kw))
      if (isHit) matchedAnyIndex.add(index)
      return isHit
    })
    if (hit) matchedLabels.push(group.label)
  }

  const out: string[] = []
  for (const label of matchedLabels) {
    if (!out.includes(label)) out.push(label)
    if (out.length >= MAX_GROUP_ITEMS) return out
  }

  // Keep a small number of unmatched raw snippets (truncated) so we don't drop
  // everything when nothing maps to a known group.
  for (let i = 0; i < normalized.length && out.length < MAX_GROUP_ITEMS; i++) {
    if (matchedAnyIndex.has(i)) continue
    const snippet = truncate(normalized[i].raw, MAX_RAW_LEN)
    if (snippet && !out.includes(snippet)) out.push(snippet)
  }

  return out
}

// True when any provided label pool contains a keyword from the given group.
function poolHasGroup(labels: string[], group: KeywordGroup): boolean {
  return labels.some((label) => {
    const norm = normalizeText(label)
    return group.keywords.some((kw) => norm.includes(kw))
  })
}

function roundAvg(values: number[]): number {
  const sum = values.reduce((acc, n) => acc + n, 0)
  return Math.round(sum / values.length)
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

const FINAL_SUMMARY: Record<ConsensusRecommendation, string> = {
  strong_apply:
    '多數模型判斷此職缺與你的條件高度匹配，建議優先投遞；仍需確認少數勞動條件。',
  apply_with_checks:
    '此職缺整體匹配度高，可投遞；但建議先確認夜勤、加班、契約或簽證等關鍵條件。',
  consider:
    '此職缺有部分匹配點，但也存在明顯不確定性；建議和其他職缺比較後再決定。',
  not_priority:
    '目前模型判斷匹配度偏低，除非有特殊理由，否則不建議優先投遞。',
  insufficient: '目前分析結果不足，請先執行至少一個 AI 分析。',
}

function buildSuggestedChecks(
  commonRisks: string[],
  commonGaps: string[],
  suggestedActions: string[]
): string[] {
  const checks: string[] = []
  const labels = [...commonRisks, ...commonGaps]
  const has = (...names: string[]) => names.some((n) => labels.includes(n))

  const add = (text: string) => {
    if (checks.length < MAX_SUGGESTED_CHECKS && !checks.includes(text)) {
      checks.push(text)
    }
  }

  if (has('夜勤/排班', '夜勤適應')) {
    add('確認夜勤頻率、排班規則與深夜交通安排')
  }
  if (has('加班/固定殘業', '勞動條件確認')) {
    add('確認實際平均加班時數與固定殘業代計算方式')
  }
  if (has('契約/非正社員')) {
    add('確認契約更新條件與正社員登用制度')
  }
  if (has('派遣')) {
    add('確認派遣契約期間、派遣先變更可能性與福利差異')
  }
  if (has('轉勤/地點變動')) {
    add('確認是否有轉勤、支援其他據點或勤務地變更的可能')
  }
  if (has('簽證不明', '簽證/在留資格確認')) {
    add('確認 Visa support、就労資格與在留資格支援')
  }
  if (has('語言壓力', '日語即時溝通')) {
    add('確認實際日語電話、文字客服與即時溝通比例')
  }
  if (has('遠端不明')) {
    add('確認是否支援在宅或リモート勤務')
  }

  // Top up from the models' own suggestedActions, avoiding duplicates.
  for (const action of suggestedActions) {
    if (checks.length >= MAX_SUGGESTED_CHECKS) break
    const snippet = truncate(action, MAX_RAW_LEN)
    if (snippet && !checks.includes(snippet)) checks.push(snippet)
  }

  return checks.slice(0, MAX_SUGGESTED_CHECKS)
}

function emptyComparison(finalSummary: string): AnalysisComparison {
  return {
    availableSources: [],
    scores: {},
    averageScore: null,
    scoreSpread: null,
    consistency: 'insufficient',
    consensusRecommendation: 'insufficient',
    commonStrengths: [],
    commonRisks: [],
    commonGaps: [],
    suggestedChecks: [],
    finalSummary,
  }
}

// Build a model comparison from the analyses already stored on a job.
// Does NOT call any AI API.
export function buildAnalysisComparison(job: unknown): AnalysisComparison {
  const raw = readRawSources(job)

  const sourceOrder: AnalysisSourceKey[] = ['local', 'gemini', 'groq', 'openrouter']
  const normalized: Partial<Record<AnalysisSourceKey, AnalysisResult>> = {}

  for (const key of sourceOrder) {
    if (!raw[key]) continue
    const result = normalizeAnalysisResult(raw[key], key, PROVIDER_DEFAULT_MODEL[key])
    // Only include sources that produced a usable numeric fitScore.
    if (typeof result.fitScore === 'number' && Number.isFinite(result.fitScore)) {
      normalized[key] = result
    }
  }

  const availableSources = sourceOrder.filter((key) => normalized[key])

  if (availableSources.length === 0) {
    return emptyComparison(FINAL_SUMMARY.insufficient)
  }

  const scores: AnalysisComparison['scores'] = {}
  const scoreValues: number[] = []
  for (const key of availableSources) {
    const score = clampScore(normalized[key]!.fitScore as number)
    scores[key] = score
    scoreValues.push(score)
  }

  const averageScore = roundAvg(scoreValues)
  const scoreSpread = Math.max(...scoreValues) - Math.min(...scoreValues)

  let consistency: AnalysisConsistency
  if (availableSources.length < 2) {
    consistency = 'insufficient'
  } else if (scoreSpread <= 10) {
    consistency = 'high'
  } else if (scoreSpread <= 20) {
    consistency = 'medium'
  } else {
    consistency = 'low'
  }

  // Pool strengths / gaps / risks across the valid sources, then group.
  const strengthPool: string[] = []
  const gapPool: string[] = []
  const riskPool: string[] = []
  const actionPool: string[] = []
  for (const key of availableSources) {
    const result = normalized[key]!
    strengthPool.push(...result.strengths)
    gapPool.push(...result.gaps)
    riskPool.push(...result.risks)
    actionPool.push(...result.suggestedActions)
  }

  const commonStrengths = groupByKeywords(strengthPool, STRENGTH_GROUPS)
  const commonRisks = groupByKeywords(riskPool, RISK_GROUPS)
  const commonGaps = groupByKeywords(gapPool, GAP_GROUPS)

  // Consensus recommendation from average + consistency.
  let consensusRecommendation: ConsensusRecommendation
  if (averageScore >= 85 && consistency !== 'low') {
    consensusRecommendation = 'strong_apply'
  } else if (averageScore >= 75) {
    consensusRecommendation = 'apply_with_checks'
  } else if (averageScore >= 60) {
    consensusRecommendation = 'consider'
  } else {
    consensusRecommendation = 'not_priority'
  }

  // High-risk concepts cap the recommendation at "apply_with_checks".
  const hasHighRisk = RISK_GROUPS.some(
    (group) =>
      HIGH_RISK_LABELS.has(group.label) && poolHasGroup(riskPool, group)
  )
  if (consensusRecommendation === 'strong_apply' && hasHighRisk) {
    consensusRecommendation = 'apply_with_checks'
  }

  const suggestedChecks = buildSuggestedChecks(
    commonRisks,
    commonGaps,
    actionPool
  )

  let finalSummary = FINAL_SUMMARY[consensusRecommendation]
  if (consistency === 'low') {
    finalSummary += '不同模型判斷差異較大，建議人工查看完整職缺內容後再決定。'
  }

  return {
    availableSources,
    scores,
    averageScore,
    scoreSpread,
    consistency,
    consensusRecommendation,
    commonStrengths,
    commonRisks,
    commonGaps,
    suggestedChecks,
    finalSummary,
  }
}
