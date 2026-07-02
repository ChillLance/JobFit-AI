'use client'

import { useState } from 'react'
import type { AnalysisResult, AnalysisProvider, FitLevel } from '@/types/analysis'
import { getActiveProfile } from '@/lib/profile'
import { getUiCopy, type UiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'
import {
  PROVIDER_DEFAULT_MODEL,
  getFitLevelLabel,
  getProviderLabel,
  getPrimaryAnalysis,
  normalizeAnalysisResult,
} from '@/lib/analysis/normalizeAnalysis'
import {
  buildAnalysisComparison,
  type AnalysisComparison,
  type AnalysisConsistency,
  type ConsensusRecommendation,
} from '@/lib/analysis/compareAnalysis'

type ActiveTab = AnalysisProvider | 'summary'

// Raw provider responses kept loose; normalizeAnalysisResult maps them to AnalysisResult.
type RawAnalysisObject = Record<string, unknown>

type DeepAnalyzeApiResponse = {
  ok?: boolean
  source?: 'cache' | 'fresh'
  analysis?: RawAnalysisObject
  error?: string
  details?: string
}

type AnalysisCopy = UiCopy['analysis']

type Props = {
  jobId: string
  initialDeepAnalysis?: RawAnalysisObject | null
  initialGroqAnalysis?: RawAnalysisObject | null
  initialOpenrouterAnalysis?: RawAnalysisObject | null
  initialLocalAnalysis?: RawAnalysisObject | null
}

type LevelTheme = {
  scoreText: string
  ring: string
  chipBg: string
  chipText: string
  chipBorder: string
}

function fitLevelTheme(level: FitLevel): LevelTheme {
  switch (level) {
    case 'excellent':
      return {
        scoreText: 'text-emerald-300',
        ring: 'border-emerald-700/70',
        chipBg: 'bg-emerald-950/50',
        chipText: 'text-emerald-200',
        chipBorder: 'border-emerald-700/70',
      }
    case 'good':
      return {
        scoreText: 'text-amber-300',
        ring: 'border-amber-700/70',
        chipBg: 'bg-amber-950/50',
        chipText: 'text-amber-200',
        chipBorder: 'border-amber-700/70',
      }
    case 'fair':
      return {
        scoreText: 'text-sky-300',
        ring: 'border-sky-700/70',
        chipBg: 'bg-sky-950/50',
        chipText: 'text-sky-200',
        chipBorder: 'border-sky-700/70',
      }
    case 'poor':
      return {
        scoreText: 'text-rose-300',
        ring: 'border-rose-700/70',
        chipBg: 'bg-rose-950/50',
        chipText: 'text-rose-200',
        chipBorder: 'border-rose-700/70',
      }
    default:
      return {
        scoreText: 'text-slate-400',
        ring: 'border-slate-700',
        chipBg: 'bg-slate-800/80',
        chipText: 'text-slate-300',
        chipBorder: 'border-slate-600',
      }
  }
}

// Pin locale + timezone so server and client render an identical string.
// Using the runtime default (toLocaleString) causes a hydration mismatch
// because Node and the browser resolve different locales/timezones.
const METADATA_DATE_FORMAT = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Tokyo',
})

function formatMetadataDate(value?: string): string {
  if (!value) return ''
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return METADATA_DATE_FORMAT.format(date)
  } catch {
    return value
  }
}

const COVERAGE_DISPLAY: Record<
  'ok' | 'partial' | 'risky',
  { label: string; box: string; text: string }
> = {
  ok: {
    label: '輸入覆蓋：良好',
    box: 'border-emerald-800/60 bg-emerald-950/30',
    text: 'text-emerald-200',
  },
  partial: {
    label: '輸入覆蓋：部分截斷',
    box: 'border-amber-800/60 bg-amber-950/30',
    text: 'text-amber-200',
  },
  risky: {
    label: '輸入覆蓋：可能漏重要資訊',
    box: 'border-rose-800/60 bg-rose-950/40',
    text: 'text-rose-200',
  },
}

function InputCoverageNotice({
  metadata,
}: {
  metadata: AnalysisResult['metadata']
}) {
  const coverage = metadata.inputCoverage
  if (!coverage) return null

  const digestStats = metadata.digestStats

  // Digest stats chips (TASK-021.3): only shown for the relevant-digest strategy.
  const isDigest =
    metadata.inputMode === 'digest' ||
    metadata.tokenStrategy === 'relevant_job_digest_v1' ||
    digestStats?.inputStrategy === 'relevant_job_digest_v1' ||
    digestStats?.extractedItemCount !== undefined

  // When the digest strategy recovered tail evidence, a truncation warning is
  // no longer alarming — the important late text was re-surfaced (TASK-021.3.1).
  const tailEvidenceCount = digestStats?.tailEvidenceSnippetCount ?? 0
  const recoveredTailEvidence = isDigest && tailEvidenceCount > 0
  const isTruncatedLevel =
    coverage.warningLevel === 'partial' || coverage.warningLevel === 'risky'

  let display = COVERAGE_DISPLAY[coverage.warningLevel]
  let label = display.label
  let warnings = coverage.warnings.slice(0, 3)

  if (recoveredTailEvidence && isTruncatedLevel) {
    display = COVERAGE_DISPLAY.partial
    label = '輸入覆蓋：部分截斷，已補回尾段證據'
    warnings = [
      '原始文字有截斷，但 Relevant Digest 已補回部分尾段重要證據。',
      '請仍以完整職缺內容作最後人工確認。',
    ]
  }

  // Diagnostic / debug detail — collapsed by default to keep the result clean.
  return (
    <details className={`group mt-4 rounded-xl border ${display.box}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5">
        <span className={`text-xs font-semibold ${display.text}`}>{label}</span>
        <span className="text-xs font-normal text-slate-500 transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="px-3 pb-3">
        {warnings.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        )}
        {isDigest && digestStats && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>輸入策略：Relevant Digest</span>
            <span>摘要項目：{digestStats.extractedItemCount ?? 0}</span>
            <span>
              已移除雜訊：行 {digestStats.boilerplateRemovedLineCount ?? 0} / 片段{' '}
              {digestStats.boilerplateRemovedPhraseCount ?? 0}
            </span>
            <span>補回尾段證據：{digestStats.tailEvidenceSnippetCount ?? 0}</span>
            <span>fallback：{digestStats.fallbackItemCount ?? 0} 條</span>
          </div>
        )}
      </div>
    </details>
  )
}

function AccentList({
  title,
  items,
  accent,
}: {
  title: string
  items: string[]
  accent: 'emerald' | 'amber' | 'rose' | 'violet'
}) {
  if (!items || items.length === 0) return null

  const accentMap: Record<typeof accent, string> = {
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    rose: 'border-l-rose-500',
    violet: 'border-l-violet-500',
  }

  const titleColor: Record<typeof accent, string> = {
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    rose: 'text-rose-300',
    violet: 'text-violet-300',
  }

  return (
    <div
      className={`rounded-xl border border-slate-800 border-l-4 ${accentMap[accent]} bg-slate-950/60 p-4`}
    >
      <h4 className={`text-sm font-semibold ${titleColor[accent]}`}>{title}</h4>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-200">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

// Renders a standardized AnalysisResult only — no provider-specific fallbacks here.
function AnalysisResultCard({
  heading,
  data,
  onRegenerate,
  isRegenerating,
  staleNotice,
  copy: a,
}: {
  heading: string
  data: AnalysisResult
  onRegenerate?: () => void
  isRegenerating?: boolean
  staleNotice?: boolean
  copy: AnalysisCopy
}) {
  const theme = fitLevelTheme(data.fitLevel)

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-50">{heading}</h3>
          <p className="mt-1 text-xs text-slate-400">
            {getProviderLabel(data.metadata.provider)}
            {data.metadata.model && (
              <span className="ml-2">模型：{data.metadata.model}</span>
            )}
          </p>
        </div>

        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-slate-500 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRegenerating ? a.regenerating : a.regenerate}
          </button>
        )}
      </div>

      {staleNotice && (
        <div className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          重新產生失敗，以下仍顯示上一次的分析結果。
        </div>
      )}

      {/* 1. Recommendation summary first. */}
      {data.summary && (
        <div className="mt-4 rounded-xl border border-violet-800/50 bg-violet-950/20 p-4">
          <h4 className="text-sm font-semibold text-violet-200">{a.finalSummary}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-200">{data.summary}</p>
        </div>
      )}

      {/* 2. Fit score / verdict. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={`rounded-xl border ${theme.ring} bg-slate-950/60 p-4`}>
          <p className="text-xs text-slate-400">{a.fitScore}</p>
          <p className={`mt-1 text-3xl font-bold ${theme.scoreText}`}>
            {data.fitScore ?? '—'}
            <span className="ml-1 text-sm text-slate-500">/ 100</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-400">{a.recommendation}</p>
          <span
            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${theme.chipBorder} ${theme.chipBg} ${theme.chipText}`}
          >
            {getFitLevelLabel(data.fitLevel)}
          </span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-400">{a.modelRecommendation}</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {data.recommendation || '—'}
          </p>
        </div>
      </div>

      {/* 3–5. Key reasons → risks → suggested actions → gaps. */}
      <div className="mt-4 grid gap-3">
        <AccentList title={a.mainReasons} items={data.strengths} accent="emerald" />
        <AccentList title={a.riskFactors} items={data.risks} accent="rose" />
        <AccentList
          title={a.suggestedActions}
          items={data.suggestedActions}
          accent="violet"
        />
        <AccentList title={a.skillGaps} items={data.gaps} accent="amber" />
      </div>

      {data.metadata.inputCoverage && (
        <InputCoverageNotice metadata={data.metadata} />
      )}

      {data.metadata.analyzedProfileName && (
        <p className="mt-3 text-xs text-violet-300">
          分析設定檔：{data.metadata.analyzedProfileName}
        </p>
      )}

      {data.metadata.createdAt && (
        <p className="mt-4 text-xs text-slate-500">
          最後分析時間：{formatMetadataDate(data.metadata.createdAt)}
          {data.metadata.inputMode && (
            <span className="ml-3">輸入模式：{data.metadata.inputMode}</span>
          )}
          {data.metadata.tokenStrategy && (
            <span className="ml-3">策略：{data.metadata.tokenStrategy}</span>
          )}
        </p>
      )}
    </div>
  )
}

function EmptyState({
  description,
  buttonLabel,
  onStart,
  isLoading,
  error,
  analyzingLabel,
}: {
  description: string
  buttonLabel: string
  onStart: () => void
  isLoading: boolean
  error?: string | null
  analyzingLabel: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
      <p className="text-sm text-slate-400">{description}</p>
      <button
        type="button"
        onClick={onStart}
        disabled={isLoading}
        className="mt-4 inline-flex items-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? analyzingLabel : buttonLabel}
      </button>
      {error && (
        <div className="mt-4 rounded-xl border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}
    </div>
  )
}

const CONSISTENCY_DISPLAY: Record<
  AnalysisConsistency,
  { label: string; chip: string }
> = {
  high: {
    label: '高',
    chip: 'border-emerald-700/70 bg-emerald-950/50 text-emerald-200',
  },
  medium: {
    label: '中',
    chip: 'border-amber-700/70 bg-amber-950/50 text-amber-200',
  },
  low: {
    label: '低',
    chip: 'border-rose-700/70 bg-rose-950/50 text-rose-200',
  },
  insufficient: {
    label: '資料不足',
    chip: 'border-slate-600 bg-slate-800/80 text-slate-300',
  },
}

const RECOMMENDATION_DISPLAY: Record<
  ConsensusRecommendation,
  { label: string; chip: string }
> = {
  strong_apply: {
    label: '優先投遞',
    chip: 'border-emerald-700/70 bg-emerald-950/50 text-emerald-200',
  },
  apply_with_checks: {
    label: '可投遞，需確認條件',
    chip: 'border-amber-700/70 bg-amber-950/50 text-amber-200',
  },
  consider: {
    label: '可考慮',
    chip: 'border-sky-700/70 bg-sky-950/50 text-sky-200',
  },
  not_priority: {
    label: '非優先',
    chip: 'border-rose-700/70 bg-rose-950/50 text-rose-200',
  },
  insufficient: {
    label: '需先分析',
    chip: 'border-slate-600 bg-slate-800/80 text-slate-300',
  },
}

function ScoreCell({
  label,
  value,
  notAnalyzedLabel,
}: {
  label: string
  value?: number
  notAnalyzedLabel: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-100">
        {typeof value === 'number' ? value : notAnalyzedLabel}
      </p>
    </div>
  )
}

function ComparisonList({
  title,
  items,
  emptyText,
  accent,
}: {
  title: string
  items: string[]
  emptyText: string
  accent: 'emerald' | 'rose' | 'amber' | 'sky'
}) {
  const accentMap: Record<typeof accent, string> = {
    emerald: 'border-l-emerald-500',
    rose: 'border-l-rose-500',
    amber: 'border-l-amber-500',
    sky: 'border-l-sky-500',
  }
  const titleColor: Record<typeof accent, string> = {
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
    amber: 'text-amber-300',
    sky: 'text-sky-300',
  }

  return (
    <div
      className={`rounded-xl border border-slate-800 border-l-4 ${accentMap[accent]} bg-slate-950/60 p-4`}
    >
      <h4 className={`text-sm font-semibold ${titleColor[accent]}`}>{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-200">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  )
}

// Compact per-model breakdown shown inside an expandable <details>. Surfaces
// each model's score, verdict, and a few top reasons / concerns without
// leaving the comparison summary.
function ModelBreakdown({
  models,
  copy: a,
}: {
  models: { provider: AnalysisProvider; result: AnalysisResult }[]
  copy: AnalysisCopy
}) {
  if (models.length === 0) return null

  return (
    <details className="group mt-4 rounded-xl border border-slate-800 bg-slate-950/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900/60">
        <span>{a.modelBreakdown(models.length)}</span>
        <span className="text-xs font-normal text-slate-500 transition group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="space-y-3 px-4 pb-4">
        {models.map(({ provider, result }) => {
          const theme = fitLevelTheme(result.fitLevel)
          const topReasons = result.strengths.slice(0, 3)
          const topConcerns = [...result.risks, ...result.gaps].slice(0, 3)

          return (
            <div
              key={provider}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">
                  {a.providers[provider]}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${theme.scoreText}`}>
                    {result.fitScore ?? '—'}
                    <span className="ml-0.5 text-xs text-slate-500">/100</span>
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${theme.chipBorder} ${theme.chipBg} ${theme.chipText}`}
                  >
                    {getFitLevelLabel(result.fitLevel)}
                  </span>
                </div>
              </div>

              {(topReasons.length > 0 || topConcerns.length > 0) && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-emerald-300">
                      {a.mainReasons}
                    </p>
                    {topReasons.length > 0 ? (
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-300">
                        {topReasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-rose-300">
                      {a.mainConcerns}
                    </p>
                    {topConcerns.length > 0 ? (
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-300">
                        {topConcerns.map((concern, index) => (
                          <li key={index}>{concern}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">—</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </details>
  )
}

function ComparisonView({
  comparison,
  models,
  copy: a,
}: {
  comparison: AnalysisComparison
  models: { provider: AnalysisProvider; result: AnalysisResult }[]
  copy: AnalysisCopy
}) {
  if (comparison.availableSources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
        <p className="text-sm text-slate-400">{a.insufficientComparison}</p>
      </div>
    )
  }

  const consistency = CONSISTENCY_DISPLAY[comparison.consistency]
  const recommendation =
    RECOMMENDATION_DISPLAY[comparison.consensusRecommendation]

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
      {/* 1. Final recommendation summary — most prominent. */}
      <div className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
            {a.finalRecommendation}
          </p>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${recommendation.chip}`}
          >
            {recommendation.label}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-100">
          {comparison.finalSummary}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          {a.comparisonFootnote}
        </p>
      </div>

      {/* 2. Fit score / verdict. */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-200">
            {a.scoresAndConsistency}
          </h4>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            {a.modelConsistency}
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${consistency.chip}`}
            >
              {consistency.label}
            </span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <ScoreCell
            label={a.providers.local}
            value={comparison.scores.local}
            notAnalyzedLabel={a.notAnalyzed}
          />
          <ScoreCell
            label={a.providers.gemini}
            value={comparison.scores.gemini}
            notAnalyzedLabel={a.notAnalyzed}
          />
          <ScoreCell
            label={a.providers.groq}
            value={comparison.scores.groq}
            notAnalyzedLabel={a.notAnalyzed}
          />
          <ScoreCell
            label={a.providers.openrouter}
            value={comparison.scores.openrouter}
            notAnalyzedLabel={a.notAnalyzed}
          />
          <div className="rounded-xl border border-violet-800/50 bg-violet-950/30 p-3 text-center">
            <p className="text-xs text-violet-300">{a.averageScore}</p>
            <p className="mt-1 text-2xl font-bold text-violet-100">
              {comparison.averageScore ?? '—'}
            </p>
          </div>
        </div>
        {typeof comparison.scoreSpread === 'number' && (
          <p className="mt-2 text-xs text-slate-500">
            {a.scoreSpread(comparison.scoreSpread)}
          </p>
        )}
      </div>

      {/* 3–5. Key reasons → risks → suggested actions / gaps. */}
      <div className="mt-4 grid gap-3">
        <ComparisonList
          title={a.commonStrengths}
          items={comparison.commonStrengths}
          emptyText={a.insufficientData}
          accent="emerald"
        />
        <ComparisonList
          title={a.commonRisks}
          items={comparison.commonRisks}
          emptyText={a.noCommonRisks}
          accent="rose"
        />
        <ComparisonList
          title={a.suggestedChecks}
          items={comparison.suggestedChecks}
          emptyText={a.noExtraChecks}
          accent="sky"
        />
        <ComparisonList
          title={a.commonGaps}
          items={comparison.commonGaps}
          emptyText={a.noCommonGaps}
          accent="amber"
        />
      </div>

      {/* 6. Per-model breakdown, collapsed by default. */}
      <ModelBreakdown models={models} copy={a} />
    </div>
  )
}

export function AnalyzeFitPanel({
  jobId,
  initialDeepAnalysis = null,
  initialGroqAnalysis = null,
  initialOpenrouterAnalysis = null,
  initialLocalAnalysis = null,
}: Props) {
  const { language } = useAppLanguage()
  const a = getUiCopy(language).analysis

  const [localAnalysis, setLocalAnalysis] = useState<RawAnalysisObject | null>(
    initialLocalAnalysis
  )
  const [geminiAnalysis, setGeminiAnalysis] = useState<RawAnalysisObject | null>(
    initialDeepAnalysis
  )
  const [groqAnalysis, setGroqAnalysis] = useState<RawAnalysisObject | null>(
    initialGroqAnalysis
  )
  const [openrouterAnalysis, setOpenrouterAnalysis] =
    useState<RawAnalysisObject | null>(initialOpenrouterAnalysis)

  const [activeTab, setActiveTab] = useState<ActiveTab>('summary')

  const [loading, setLoading] = useState<Record<AnalysisProvider, boolean>>({
    local: false,
    gemini: false,
    groq: false,
    openrouter: false,
  })
  const [errors, setErrors] = useState<Record<AnalysisProvider, string | null>>({
    local: null,
    gemini: null,
    groq: null,
    openrouter: null,
  })
  const [staleNotice, setStaleNotice] = useState<Record<AnalysisProvider, boolean>>({
    local: false,
    gemini: false,
    groq: false,
    openrouter: false,
  })

  function setProviderLoading(provider: AnalysisProvider, value: boolean) {
    setLoading((prev) => ({ ...prev, [provider]: value }))
  }

  function setProviderError(provider: AnalysisProvider, value: string | null) {
    setErrors((prev) => ({ ...prev, [provider]: value }))
  }

  function setProviderStale(provider: AnalysisProvider, value: boolean) {
    setStaleNotice((prev) => ({ ...prev, [provider]: value }))
  }

  async function runLocalAnalyze() {
    setProviderLoading('local', true)
    setProviderError('local', null)
    setProviderStale('local', false)

    const hadResult = Boolean(localAnalysis)

    try {
      // Always analyze against the active profile (falls back to the default
      // profile inside the store when nothing is selected).
      const profile = getActiveProfile()
      const response = await fetch(`/api/jobs/${jobId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, language }),
      })

      const contentType = response.headers.get('content-type') || ''
      const payload = contentType.includes('application/json')
        ? await response.json()
        : null

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : '本地分析時發生錯誤，請稍後再試一次。'

        if (hadResult) {
          setProviderStale('local', true)
        } else {
          setProviderError('local', message)
        }
        return
      }

      setLocalAnalysis(payload as RawAnalysisObject)
      setProviderError('local', null)
    } catch {
      const message = '無法連線到本地分析服務，請確認本地伺服器是否仍在執行。'
      if (hadResult) {
        setProviderStale('local', true)
      } else {
        setProviderError('local', message)
      }
    } finally {
      setProviderLoading('local', false)
    }
  }

  async function runDeepAnalyze(
    provider: 'gemini' | 'groq' | 'openrouter',
    force: boolean
  ) {
    const endpoint =
      provider === 'gemini'
        ? `/api/jobs/${jobId}/analyze/deep`
        : provider === 'groq'
          ? `/api/jobs/${jobId}/analyze/groq`
          : `/api/jobs/${jobId}/analyze/openrouter`

    const hadResult = Boolean(
      provider === 'gemini'
        ? geminiAnalysis
        : provider === 'groq'
          ? groqAnalysis
          : openrouterAnalysis
    )

    setProviderLoading(provider, true)
    setProviderError(provider, null)
    setProviderStale(provider, false)

    try {
      // Always analyze against the active profile (falls back to the default
      // profile inside the store when nothing is selected).
      const profile = getActiveProfile()
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force, profile, language }),
      })

      const data = (await res.json()) as DeepAnalyzeApiResponse

      if (!res.ok || !data.analysis) {
        const baseLabel =
          provider === 'gemini'
            ? 'Gemini 分析失敗'
            : provider === 'groq'
              ? 'Groq Llama 70B 分析失敗'
              : 'OpenRouter 分析失敗'
        const message =
          typeof data.details === 'string'
            ? `${data.error || baseLabel}：${data.details}`
            : typeof data.error === 'string'
              ? data.error
              : baseLabel

        if (hadResult) {
          setProviderStale(provider, true)
        } else {
          setProviderError(provider, message)
        }
        return
      }

      if (provider === 'gemini') {
        setGeminiAnalysis(data.analysis)
      } else if (provider === 'groq') {
        setGroqAnalysis(data.analysis)
      } else {
        setOpenrouterAnalysis(data.analysis)
      }
      setProviderError(provider, null)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : provider === 'gemini'
            ? 'Gemini 分析失敗'
            : provider === 'groq'
              ? 'Groq Llama 70B 分析失敗'
              : 'OpenRouter 分析失敗'

      if (hadResult) {
        setProviderStale(provider, true)
      } else {
        setProviderError(provider, message)
      }
    } finally {
      setProviderLoading(provider, false)
    }
  }

  // Normalized results, computed once per render from raw provider state.
  const localResult: AnalysisResult | null = localAnalysis
    ? normalizeAnalysisResult(localAnalysis, 'local', PROVIDER_DEFAULT_MODEL.local)
    : null
  const geminiResult: AnalysisResult | null = geminiAnalysis
    ? normalizeAnalysisResult(geminiAnalysis, 'gemini', PROVIDER_DEFAULT_MODEL.gemini)
    : null
  const groqResult: AnalysisResult | null = groqAnalysis
    ? normalizeAnalysisResult(groqAnalysis, 'groq', PROVIDER_DEFAULT_MODEL.groq)
    : null
  const openrouterResult: AnalysisResult | null = openrouterAnalysis
    ? normalizeAnalysisResult(
        openrouterAnalysis,
        'openrouter',
        PROVIDER_DEFAULT_MODEL.openrouter
      )
    : null

  // Best available analysis for the overview card: gemini > groq > openrouter > local.
  const overview = getPrimaryAnalysis({
    deepAnalysis: geminiAnalysis ?? undefined,
    groqAnalysis: groqAnalysis ?? undefined,
    openrouterAnalysis: openrouterAnalysis ?? undefined,
    localAnalysis: localAnalysis ?? undefined,
  })

  const overviewTheme = fitLevelTheme(overview?.fitLevel ?? 'unknown')

  // Model comparison derived purely from the current results — no AI call.
  const comparison = buildAnalysisComparison({
    localAnalysis: localAnalysis ?? undefined,
    deepAnalysis: geminiAnalysis ?? undefined,
    groqAnalysis: groqAnalysis ?? undefined,
    openrouterAnalysis: openrouterAnalysis ?? undefined,
  })

  const hasResult: Record<AnalysisProvider, boolean> = {
    local: Boolean(localResult),
    gemini: Boolean(geminiResult),
    groq: Boolean(groqResult),
    openrouter: Boolean(openrouterResult),
  }

  // Normalized per-model results used by the comparison's expandable breakdown.
  const comparisonModels: { provider: AnalysisProvider; result: AnalysisResult }[] =
    [
      localResult ? { provider: 'local' as const, result: localResult } : null,
      geminiResult
        ? { provider: 'gemini' as const, result: geminiResult }
        : null,
      groqResult ? { provider: 'groq' as const, result: groqResult } : null,
      openrouterResult
        ? { provider: 'openrouter' as const, result: openrouterResult }
        : null,
    ].filter(
      (entry): entry is { provider: AnalysisProvider; result: AnalysisResult } =>
        entry !== null
    )

  const providerTabs: AnalysisProvider[] = [
    'local',
    'gemini',
    'groq',
    'openrouter',
  ]

  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div>
        <h2 className="text-xl font-bold text-slate-50">{a.centerTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{a.centerSubtitle}</p>
      </div>

      {/* Overview card */}
      <div className="mt-5 rounded-2xl border border-violet-800/40 bg-gradient-to-br from-slate-950 to-violet-950/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
          {a.overviewLabel}
        </p>
        {overview ? (
          <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs text-slate-400">{a.fitScore}</p>
              <p className={`text-4xl font-bold ${overviewTheme.scoreText}`}>
                {overview.fitScore ?? '—'}
                <span className="ml-1 text-base text-slate-500">/ 100</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{a.recommendation}</p>
              <span
                className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${overviewTheme.chipBorder} ${overviewTheme.chipBg} ${overviewTheme.chipText}`}
              >
                {getFitLevelLabel(overview.fitLevel)}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400">{a.source}</p>
              <p className="mt-1.5 text-sm font-semibold text-slate-100">
                {getProviderLabel(overview.metadata.provider)}
              </p>
            </div>
            {overview.metadata.createdAt && (
              <div>
                <p className="text-xs text-slate-400">{a.lastAnalyzed}</p>
                <p className="mt-1.5 text-sm text-slate-300">
                  {formatMetadataDate(overview.metadata.createdAt)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-2xl font-bold text-slate-500">
            {a.notYetAnalyzed}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'summary'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {a.modelComparison}
        </button>
        {providerTabs.map((provider) => {
          const isActive = activeTab === provider
          return (
            <button
              key={provider}
              type="button"
              onClick={() => setActiveTab(provider)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {a.providers[provider]}
              {hasResult[provider] && (
                <span
                  className={`ml-1.5 ${isActive ? 'text-violet-100' : 'text-emerald-400'}`}
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {activeTab === 'summary' && (
          <ComparisonView
            comparison={comparison}
            models={comparisonModels}
            copy={a}
          />
        )}

        {activeTab === 'local' &&
          (localResult ? (
            <AnalysisResultCard
              heading={a.resultHeadings.local}
              data={localResult}
              onRegenerate={runLocalAnalyze}
              isRegenerating={loading.local}
              staleNotice={staleNotice.local}
              copy={a}
            />
          ) : (
            <EmptyState
              description={a.emptyDescriptions.local}
              buttonLabel={a.startLabels.local}
              onStart={runLocalAnalyze}
              isLoading={loading.local}
              error={errors.local}
              analyzingLabel={a.analyzing}
            />
          ))}

        {activeTab === 'gemini' &&
          (geminiResult ? (
            <AnalysisResultCard
              heading={a.resultHeadings.gemini}
              data={geminiResult}
              onRegenerate={() => runDeepAnalyze('gemini', true)}
              isRegenerating={loading.gemini}
              staleNotice={staleNotice.gemini}
              copy={a}
            />
          ) : (
            <EmptyState
              description={a.emptyDescriptions.gemini}
              buttonLabel={a.startLabels.gemini}
              onStart={() => runDeepAnalyze('gemini', false)}
              isLoading={loading.gemini}
              error={errors.gemini}
              analyzingLabel={a.analyzing}
            />
          ))}

        {activeTab === 'groq' &&
          (groqResult ? (
            <AnalysisResultCard
              heading={a.resultHeadings.groq}
              data={groqResult}
              onRegenerate={() => runDeepAnalyze('groq', true)}
              isRegenerating={loading.groq}
              staleNotice={staleNotice.groq}
              copy={a}
            />
          ) : (
            <EmptyState
              description={a.emptyDescriptions.groq}
              buttonLabel={a.startLabels.groq}
              onStart={() => runDeepAnalyze('groq', false)}
              isLoading={loading.groq}
              error={errors.groq}
              analyzingLabel={a.analyzing}
            />
          ))}

        {activeTab === 'openrouter' &&
          (openrouterResult ? (
            <AnalysisResultCard
              heading={a.resultHeadings.openrouter}
              data={openrouterResult}
              onRegenerate={() => runDeepAnalyze('openrouter', true)}
              isRegenerating={loading.openrouter}
              staleNotice={staleNotice.openrouter}
              copy={a}
            />
          ) : (
            <EmptyState
              description={a.emptyDescriptions.openrouter}
              buttonLabel={a.startLabels.openrouter}
              onStart={() => runDeepAnalyze('openrouter', false)}
              isLoading={loading.openrouter}
              error={errors.openrouter}
              analyzingLabel={a.analyzing}
            />
          ))}
      </div>
    </section>
  )
}
