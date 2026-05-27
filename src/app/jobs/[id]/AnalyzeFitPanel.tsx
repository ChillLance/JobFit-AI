'use client'

import { useState } from 'react'

type RecommendedAction = 'apply' | 'maybe' | 'skip' | string

type JobFitAnalysis = {
  jobId: string
  source: string
  analysisVersion: number
  fitScore: number
  recommendedAction: RecommendedAction
  summary: string
  strengths: string[]
  gaps: string[]
  requiredSkills: string[]
  bonusSkills: string[]
  resumeAdvice: string[]
  interviewPrep: string[]
  metadata?: {
    jobTitle?: string
    company?: string
    profileVersion?: number
    deepAnalysisRecommended?: boolean
    deepAnalysisPriority?: 'high' | 'medium' | 'low'
    deepAnalysisReason?: string
  }
}

type Props = {
  jobId: string
}

function formatRecommendedAction(action: RecommendedAction): string {
  switch (action) {
    case 'apply':
      return '建議投遞'
    case 'maybe':
      return '可以考慮'
    case 'skip':
      return '暫不建議'
    default:
      return action
  }
}

function formatSource(source: string): string {
  if (source === 'local-placeholder') {
    return '本地規則分析'
  }
  return source
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

export function AnalyzeFitPanel({ jobId }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [analysis, setAnalysis] = useState<JobFitAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    setIsLoading(true)
    setError(null)

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
        setError(message)
        setAnalysis(null)
        return
      }

      setAnalysis(payload as JobFitAnalysis)
    } catch {
      setError('無法連線到分析服務，請確認本地伺服器是否仍在執行。')
      setAnalysis(null)
    } finally {
      setIsLoading(false)
    }
  }

  const buttonLabel = isLoading
    ? '分析中...'
    : analysis
      ? '重新分析'
      : '開始分析'

  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">AI 職缺適合度分析</h2>
          <p className="mt-1 text-sm text-slate-400">
            根據這份職缺內容與你的{' '}
            <span className="font-semibold">user_profile.json</span>{' '}
            進行本地規則分析，提供職缺適合度與履歷／面試建議。
          </p>
          {analysis?.metadata && (
            <p className="mt-2 text-xs text-slate-500">
              {analysis.metadata.jobTitle && (
                <span className="mr-3">
                  職缺：{analysis.metadata.jobTitle}
                </span>
              )}
              {analysis.metadata.company && (
                <span className="mr-3">公司：{analysis.metadata.company}</span>
              )}
              {typeof analysis.metadata.profileVersion === 'number' && (
                <span>個人檔案版本 v{analysis.metadata.profileVersion}</span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isLoading}
            className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel}
          </button>
          {isLoading ? (
            <p className="text-xs text-slate-500">本地規則分析執行中...</p>
          ) : (
            <p className="text-xs text-slate-500">
              不會呼叫外部 AI，只在本機運行。
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {analysis?.metadata?.deepAnalysisRecommended && (
        <div className="mt-4 rounded-xl border border-amber-700/60 bg-amber-950/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-amber-200">建議進行深度分析</p>
            {analysis.metadata.deepAnalysisPriority && (
              <span className="rounded-full border border-amber-600/60 bg-amber-900/50 px-2 py-0.5 text-xs text-amber-100">
                優先度：{formatDeepAnalysisPriority(analysis.metadata.deepAnalysisPriority)}
              </span>
            )}
          </div>
          {analysis.metadata.deepAnalysisReason && (
            <p className="mt-2 text-sm text-amber-100/90">
              {analysis.metadata.deepAnalysisReason}
            </p>
          )}
          <p className="mt-2 text-xs text-amber-200/70">
            深度分析（Gemini）尚未接入；目前僅為本地規則的後續建議標記。
          </p>
        </div>
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
                {formatSource(analysis.source)}
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
          <SectionList title="職缺要求技能" items={analysis.requiredSkills} />
          <SectionList title="加分技能" items={analysis.bonusSkills} />
          <SectionList title="履歷建議" items={analysis.resumeAdvice} />
          <SectionList title="面試準備" items={analysis.interviewPrep} />
        </div>
      )}
    </section>
  )
}
