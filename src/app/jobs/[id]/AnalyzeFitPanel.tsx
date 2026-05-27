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
  }
}

type Props = {
  jobId: string
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
    } catch (err) {
      setError('無法連線到分析服務，請確認本地伺服器是否仍在執行。')
      setAnalysis(null)
    } finally {
      setIsLoading(false)
    }
  }

  const buttonLabel = isLoading
    ? 'Analyzing...'
    : analysis
      ? 'Analyze Again'
      : 'Analyze Fit'

  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">AI Job Fit Analysis</h2>
          <p className="mt-1 text-sm text-slate-400">
            根據這份職缺內容與你的{' '}
            <span className="font-semibold">user_profile.json</span>{' '}
            進行在地規則分析，提供職缺適合度與履歷／面試建議。
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
                <span>Profile v{analysis.metadata.profileVersion}</span>
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

      {analysis && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-400">Fit Score</p>
              <p className="mt-2 text-3xl font-bold text-emerald-400">
                {analysis.fitScore}
                <span className="ml-1 text-sm text-slate-400">/ 100</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-400">Recommended Action</p>
              <p className="mt-2 text-lg font-semibold capitalize text-slate-100">
                {analysis.recommendedAction}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-400">Source</p>
              <p className="mt-2 text-sm text-slate-200">
                {analysis.source === 'local-placeholder'
                  ? 'Local placeholder / rule-based'
                  : analysis.source}
              </p>
            </div>
          </div>

          {analysis.summary && (
            <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-slate-200">Summary</h3>
              <p className="mt-2 text-sm text-slate-200">{analysis.summary}</p>
            </div>
          )}

          <SectionList title="Strengths" items={analysis.strengths} />
          <SectionList title="Gaps / Risks" items={analysis.gaps} />
          <SectionList title="Required Skills (from job)" items={analysis.requiredSkills} />
          <SectionList title="Bonus Skills" items={analysis.bonusSkills} />
          <SectionList title="Resume Advice" items={analysis.resumeAdvice} />
          <SectionList title="Interview Prep" items={analysis.interviewPrep} />
        </div>
      )}
    </section>
  )
}

