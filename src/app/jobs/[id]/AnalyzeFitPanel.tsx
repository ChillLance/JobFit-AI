'use client'

import { useState } from 'react'

type RecommendedAction = 'apply' | 'maybe' | 'skip' | string

type LocalJobFitAnalysis = {
  jobId: string
  source: string
  analysisVersion: number | string
  analysisType?: string
  fitScore: number
  recommendedAction: RecommendedAction
  summary: string
  strengths: string[]
  gaps: string[]
  riskFactors?: string[]
  requiredSkills: string[]
  bonusSkills: string[]
  resumeAdvice: string[]
  interviewPrep: string[]
  questionsToAskEmployer?: string[]
  metadata?: {
    jobTitle?: string
    company?: string
    profileVersion?: number | string
    source?: string
    model?: string
    createdAt?: string
    deepAnalysisRecommended?: boolean
    deepAnalysisPriority?: 'high' | 'medium' | 'low'
    deepAnalysisReason?: string
  }
}

type DeepJobFitAnalysis = {
  jobId: string
  analysisType: 'gemini-deep'
  analysisVersion: string
  fitScore: number
  recommendedAction: RecommendedAction
  summary: string
  strengths: string[]
  gaps: string[]
  riskFactors: string[]
  requiredSkills: string[]
  bonusSkills: string[]
  resumeAdvice: string[]
  interviewPrep: string[]
  questionsToAskEmployer: string[]
  metadata: {
    source: 'gemini'
    model: string
    profileVersion: string | number
    createdAt: string
  }
}

type DisplayAnalysis = LocalJobFitAnalysis | DeepJobFitAnalysis

type Props = {
  jobId: string
  initialDeepAnalysis?: DeepJobFitAnalysis | null
  initialLocalAnalysis?: LocalJobFitAnalysis | null
}

function formatRecommendedAction(action?: RecommendedAction): string {
  switch (action) {
    case 'apply':
      return '建議投遞'
    case 'maybe':
      return '可以考慮'
    case 'skip':
      return '暫不建議'
    default:
      return '待判斷'
  }
}

function isDeepAnalysis(
  analysis: DisplayAnalysis | null | undefined
): analysis is DeepJobFitAnalysis {
  if (!analysis) return false
  return (
    analysis.analysisType === 'gemini-deep' ||
    analysis.metadata?.source === 'gemini'
  )
}

function formatAnalysisSource(analysis: DisplayAnalysis | null | undefined): string {
  if (isDeepAnalysis(analysis)) {
    return 'Gemini 深度分析'
  }
  if (analysis && 'source' in analysis && analysis.source === 'local-placeholder') {
    return '本地規則分析'
  }
  return '本地規則分析'
}

function formatDeepAnalysisPriority(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return priority
  }
}

function formatMetadataDate(value?: string): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function SectionList({
  title,
  items,
}: {
  title: string
  items?: string[]
}) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function AnalyzeFitPanel({
  jobId,
  initialDeepAnalysis = null,
  initialLocalAnalysis = null,
}: Props) {
  const [localAnalysis, setLocalAnalysis] = useState<LocalJobFitAnalysis | null>(
    initialLocalAnalysis
  )
  const [deepAnalysis, setDeepAnalysis] = useState<DeepJobFitAnalysis | null>(
    initialDeepAnalysis
  )
  const [isLocalLoading, setIsLocalLoading] = useState(false)
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [deepAnalyzeError, setDeepAnalyzeError] = useState<string | null>(null)

  const analysis: DisplayAnalysis | null = deepAnalysis ?? localAnalysis
  const showingDeep = isDeepAnalysis(analysis)

  const localMetadata =
    !showingDeep && localAnalysis?.metadata ? localAnalysis.metadata : undefined

  async function handleLocalAnalyze() {
    setIsLocalLoading(true)
    setLocalError(null)

    try {
      const response = await fetch(`/api/jobs/${jobId}/analyze`, {
        method: 'POST',
      })

      let payload: unknown = null
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        payload = await response.json()
      }

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : '分析時發生錯誤，請稍後再試一次。'
        setLocalError(message)
        return
      }

      setLocalAnalysis(payload as LocalJobFitAnalysis)
    } catch {
      setLocalError('無法連線到分析服務，請確認本地伺服器是否仍在執行。')
    } finally {
      setIsLocalLoading(false)
    }
  }

  async function handleDeepAnalyze() {
    try {
      setIsDeepAnalyzing(true)
      setDeepAnalyzeError(null)

      const res = await fetch(`/api/jobs/${jobId}/analyze/deep`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        const message =
          typeof data.details === 'string'
            ? `${data.error || 'Gemini 深度分析失敗'}：${data.details}`
            : typeof data.error === 'string'
              ? data.error
              : 'Gemini 深度分析失敗'

        throw new Error(message)
      }

      setDeepAnalysis(data as DeepJobFitAnalysis)
    } catch (error) {
      console.error(error)
      setDeepAnalyzeError(
        error instanceof Error ? error.message : 'Gemini 深度分析失敗'
      )
    } finally {
      setIsDeepAnalyzing(false)
    }
  }

  const localButtonLabel = isLocalLoading
    ? '分析中...'
    : localAnalysis
      ? '重新本地分析'
      : '開始本地分析'

  const deepButtonLabel = isDeepAnalyzing
    ? '分析中...'
    : deepAnalysis
      ? '重新分析'
      : '開始 Gemini 深度分析'

  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">AI 職缺適合度分析</h2>
          <p className="mt-1 text-sm text-slate-400">
            可先進行本地規則分析，再依建議觸發 Gemini 深度分析；深度分析結果會保存至{' '}
            <span className="font-semibold">jobs_temp.json</span>。
          </p>
          {localMetadata && (
            <p className="mt-2 text-xs text-slate-500">
              {localMetadata.jobTitle && (
                <span className="mr-3">職缺：{localMetadata.jobTitle}</span>
              )}
              {localMetadata.company && (
                <span className="mr-3">公司：{localMetadata.company}</span>
              )}
              {localMetadata.profileVersion !== undefined && (
                <span>個人檔案版本 v{localMetadata.profileVersion}</span>
              )}
            </p>
          )}
          {showingDeep && analysis?.metadata && (
            <p className="mt-2 text-xs text-slate-500">
              {analysis.metadata.model && (
                <span className="mr-3">模型：{analysis.metadata.model}</span>
              )}
              {analysis.metadata.createdAt && (
                <span>
                  分析時間：{formatMetadataDate(analysis.metadata.createdAt)}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleLocalAnalyze}
            disabled={isLocalLoading || isDeepAnalyzing}
            className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {localButtonLabel}
          </button>
          <button
            type="button"
            onClick={handleDeepAnalyze}
            disabled={isDeepAnalyzing || isLocalLoading}
            className="inline-flex items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deepButtonLabel}
          </button>
          {isLocalLoading && (
            <p className="text-xs text-slate-500">本地規則分析執行中...</p>
          )}
        </div>
      </div>

      {localError && (
        <div className="mt-4 rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-200">
          {localError}
        </div>
      )}

      {deepAnalyzeError && (
        <p className="mt-4 text-sm text-red-400">{deepAnalyzeError}</p>
      )}

      {!showingDeep && localMetadata?.deepAnalysisRecommended && (
        <div className="mt-4 rounded-xl border border-amber-700/60 bg-amber-950/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-amber-200">建議進行深度分析</p>
            {localMetadata.deepAnalysisPriority && (
              <span className="rounded-full border border-amber-600/60 bg-amber-900/50 px-2 py-0.5 text-xs text-amber-100">
                優先度：{formatDeepAnalysisPriority(localMetadata.deepAnalysisPriority)}
              </span>
            )}
          </div>
          {localMetadata.deepAnalysisReason && (
            <p className="mt-2 text-sm text-amber-100/90">
              {localMetadata.deepAnalysisReason}
            </p>
          )}
          {deepAnalysis ? (
            <p className="mt-2 text-xs text-amber-200/70">
              已完成 Gemini 深度分析，以下為深度分析結果。
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-200/70">
              本地適合度分數較高，且職缺包含需要確認的條件，建議進行 Gemini
              深度分析。
            </p>
          )}
        </div>
      )}

      {showingDeep && (
        <p className="mt-4 text-sm text-violet-200/90">
          已完成 Gemini 深度分析，以下為深度分析結果。
        </p>
      )}

      {analysis && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-400">適合度分數</p>
              <p className="mt-2 text-3xl font-bold text-emerald-400">
                {analysis.fitScore}
                <span className="ml-1 text-sm text-slate-400">/ 100</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-400">建議行動</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {formatRecommendedAction(analysis.recommendedAction)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-400">分析來源</p>
              <p className="mt-2 text-sm text-slate-200">
                {formatAnalysisSource(analysis)}
              </p>
            </div>
          </div>

          {analysis.summary && (
            <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-slate-200">分析摘要</h3>
              <p className="mt-2 text-sm text-slate-200">{analysis.summary}</p>
            </div>
          )}

          <SectionList title="適合優勢" items={analysis.strengths} />
          <SectionList title="可能落差" items={analysis.gaps} />
          <SectionList title="風險因素" items={analysis.riskFactors} />
          <SectionList title="職缺要求技能" items={analysis.requiredSkills} />
          <SectionList title="加分技能" items={analysis.bonusSkills} />
          <SectionList title="履歷建議" items={analysis.resumeAdvice} />
          <SectionList title="面試準備" items={analysis.interviewPrep} />
          <SectionList
            title="建議向雇主確認"
            items={analysis.questionsToAskEmployer}
          />
        </div>
      )}
    </section>
  )
}
