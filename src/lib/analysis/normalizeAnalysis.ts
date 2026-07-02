// Centralized normalization + display helpers for analysis results (TASK-020).
// All UI fallback logic (field-name differences, level/label/color mapping, and
// picking the primary analysis for a job) lives here so components stay clean.

import type {
  AnalysisJobInput,
  AnalysisMetadata,
  AnalysisProvider,
  AnalysisResult,
  DigestStatsSummary,
  FitLevel,
  InputCoverageSummary,
} from '@/types/analysis'

export const PROVIDER_DEFAULT_MODEL: Record<AnalysisProvider, string> = {
  local: 'local-rules-v1',
  gemini: 'gemini-3.5-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct',
}

const PROVIDER_LABEL: Record<AnalysisProvider, string> = {
  local: '本地規則分析',
  gemini: 'Gemini 深度分析',
  groq: 'Groq Llama 70B',
  openrouter: 'OpenRouter',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

// Collect non-empty trimmed strings from any number of array-like sources.
function collectStrings(...values: unknown[]): string[] {
  const out: string[] = []

  for (const value of values) {
    if (!Array.isArray(value)) continue
    for (const item of value) {
      const s = typeof item === 'string' ? item.trim() : ''
      if (s) out.push(s)
    }
  }

  return uniqStrings(out)
}

// First finite numeric value, clamped to 0–100. Returns null when nothing usable.
function firstScore(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.min(100, Math.round(value)))
    }
  }
  return null
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function asFitLevel(value: unknown): FitLevel | null {
  if (
    value === 'excellent' ||
    value === 'good' ||
    value === 'fair' ||
    value === 'poor' ||
    value === 'unknown'
  ) {
    return value
  }
  return null
}

// Map a legacy `recommendedAction` (apply/maybe/skip) to a recommendation label.
function recommendationFromAction(value: unknown): string {
  switch (value) {
    case 'apply':
      return '建議投遞'
    case 'maybe':
      return '可以考慮'
    case 'skip':
      return '暫不建議'
    default:
      return ''
  }
}

function asInputMode(value: unknown): AnalysisMetadata['inputMode'] {
  if (
    value === 'rules' ||
    value === 'full' ||
    value === 'compact' ||
    value === 'digest'
  ) {
    return value
  }
  return undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

// Pull a compact digest-stats summary (counts only) from the stored inputStats.
function asDigestStats(value: unknown): DigestStatsSummary | undefined {
  if (!isRecord(value)) return undefined

  const digestStats = isRecord(value.digestStats) ? value.digestStats : {}

  const summary: DigestStatsSummary = {
    inputStrategy:
      typeof value.inputStrategy === 'string' && value.inputStrategy.trim()
        ? value.inputStrategy.trim()
        : undefined,
    extractedItemCount: asNumber(digestStats.extractedItemCount),
    boilerplateRemovedLineCount: asNumber(
      digestStats.boilerplateRemovedLineCount
    ),
    boilerplateRemovedPhraseCount: asNumber(
      digestStats.boilerplateRemovedPhraseCount
    ),
    evidenceSnippetCount: asNumber(value.evidenceSnippetCount),
    tailEvidenceSnippetCount: asNumber(value.tailEvidenceSnippetCount),
    fallbackItemCount: asNumber(value.fallbackItemCount),
  }

  const hasAny = Object.values(summary).some((v) => v !== undefined)
  return hasAny ? summary : undefined
}

function asSource(value: unknown): AnalysisMetadata['source'] {
  if (value === 'cache' || value === 'fresh') return value
  return undefined
}

// Extract just the warningLevel + warnings the UI needs from a stored coverage
// report; ignore the rest (lengths, per-keyword flags) for display.
function asInputCoverage(value: unknown): InputCoverageSummary | undefined {
  if (!isRecord(value)) return undefined

  const level = value.warningLevel
  if (level !== 'ok' && level !== 'partial' && level !== 'risky') {
    return undefined
  }

  const warnings = Array.isArray(value.warnings)
    ? value.warnings
        .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
        .map((w) => w.trim())
    : []

  return { warningLevel: level, warnings }
}

// score >= 85 → excellent, >= 70 → good, >= 50 → fair, < 50 → poor, null → unknown.
export function getFitLevel(score: number | null | undefined): FitLevel {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'unknown'
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
}

export function getFitLevelLabel(level: FitLevel): string {
  switch (level) {
    case 'excellent':
      return '高度推薦'
    case 'good':
      return '建議投遞'
    case 'fair':
      return '可考慮'
    case 'poor':
      return '不太適合'
    default:
      return '待分析'
  }
}

export function getScoreColorClass(score: number | null | undefined): string {
  switch (getFitLevel(score)) {
    case 'excellent':
      return 'text-emerald-300'
    case 'good':
      return 'text-amber-300'
    case 'fair':
      return 'text-sky-300'
    case 'poor':
      return 'text-rose-300'
    default:
      return 'text-slate-400'
  }
}

export function getProviderLabel(provider: AnalysisProvider): string {
  return PROVIDER_LABEL[provider]
}

function normalizeMetadata(
  rawMeta: unknown,
  provider: AnalysisProvider,
  fallbackModel: string,
  fallbackCreatedAt: string
): AnalysisMetadata {
  const meta = isRecord(rawMeta) ? rawMeta : {}

  const profileVersion =
    meta.profileVersion !== undefined && meta.profileVersion !== null
      ? String(meta.profileVersion)
      : undefined

  return {
    provider,
    model: firstNonEmptyString(meta.model, fallbackModel) || fallbackModel,
    createdAt: firstNonEmptyString(meta.createdAt, fallbackCreatedAt),
    profileVersion,
    cacheExpiresAt: firstNonEmptyString(meta.cacheExpiresAt) || undefined,
    inputMode: asInputMode(meta.inputMode),
    tokenStrategy: firstNonEmptyString(meta.tokenStrategy) || undefined,
    source: asSource(meta.source),
    inputCoverage: asInputCoverage(meta.inputCoverage),
    digestStats: asDigestStats(meta.inputStats),
    analyzedProfileId: firstNonEmptyString(meta.analyzedProfileId) || undefined,
    analyzedProfileName:
      firstNonEmptyString(meta.analyzedProfileName) || undefined,
    analyzedAt: firstNonEmptyString(meta.analyzedAt) || undefined,
  }
}

// Normalize any provider's raw analysis object into the unified AnalysisResult.
// Handles differing field names and supplies safe defaults for missing fields.
export function normalizeAnalysisResult(
  raw: unknown,
  provider: AnalysisProvider,
  fallbackModel: string
): AnalysisResult {
  const data = isRecord(raw) ? raw : {}

  // score / aiScore / fitScore → fitScore
  const fitScore = firstScore(data.fitScore, data.aiScore, data.score)

  // level / fitLevel → fitLevel (fall back to deriving from the score)
  const explicitLevel = asFitLevel(data.fitLevel) ?? asFitLevel(data.level)
  const fitLevel = explicitLevel ?? getFitLevel(fitScore)

  const recommendation =
    firstNonEmptyString(data.recommendation) ||
    recommendationFromAction(data.recommendedAction)

  const summary = firstNonEmptyString(data.summary)

  const strengths = collectStrings(data.strengths)

  // weaknesses / possibleGaps / gaps (+ legacy `concerns`) → gaps
  const gaps = collectStrings(
    data.gaps,
    data.weaknesses,
    data.possibleGaps,
    data.concerns
  )

  // riskFactors / risks → risks
  const risks = collectStrings(data.risks, data.riskFactors)

  // recommendedActions / suggestedActions (+ legacy advice arrays) → suggestedActions
  const suggestedActions = collectStrings(
    data.suggestedActions,
    data.recommendedActions,
    data.resumeAdvice,
    data.interviewPrep,
    data.questionsToAskEmployer,
    data.applicationAdvice
  )

  const metadata = normalizeMetadata(
    data.metadata,
    provider,
    fallbackModel,
    // Legacy aiScore objects store the timestamp on `generatedAt`.
    firstNonEmptyString(data.generatedAt)
  )

  return {
    fitScore,
    fitLevel,
    recommendation,
    summary,
    strengths,
    gaps,
    risks,
    suggestedActions,
    metadata,
  }
}

// Pick the best available analysis for a job and normalize it.
// Priority: Gemini deepAnalysis > Groq groqAnalysis > local. The local source
// is read as `localAnalysis ?? analysis ?? aiScore`, matching readRawSources in
// compareAnalysis so both readers agree (redesign Phase 1). `analysis` is the
// deprecated local write key; `aiScore` is the legacy mock score.
export function getPrimaryAnalysis(job: AnalysisJobInput): AnalysisResult | null {
  if (isRecord(job.deepAnalysis)) {
    return normalizeAnalysisResult(
      job.deepAnalysis,
      'gemini',
      PROVIDER_DEFAULT_MODEL.gemini
    )
  }

  if (isRecord(job.groqAnalysis)) {
    return normalizeAnalysisResult(
      job.groqAnalysis,
      'groq',
      PROVIDER_DEFAULT_MODEL.groq
    )
  }

  if (isRecord(job.openrouterAnalysis)) {
    return normalizeAnalysisResult(
      job.openrouterAnalysis,
      'openrouter',
      PROVIDER_DEFAULT_MODEL.openrouter
    )
  }

  const localRaw =
    (isRecord(job.localAnalysis) && job.localAnalysis) ||
    (isRecord(job.analysis) && job.analysis) ||
    (isRecord(job.aiScore) && job.aiScore) ||
    null

  if (localRaw) {
    return normalizeAnalysisResult(
      localRaw,
      'local',
      PROVIDER_DEFAULT_MODEL.local
    )
  }

  return null
}
