'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type AiScore = {
  score: number
  level: string
  summary: string
  strengths: string[]
  concerns: string[]
  requiredSkills: string[]
  bonusSkills: string[]
  applicationAdvice: string[]
  generatedAt: string
}

type JobStatus =
  | 'not_applied'
  | 'applied'
  | 'interview'
  | 'not_interested'

const STATUS_LABELS: Record<JobStatus, string> = {
  not_applied: '未投遞',
  applied: '已投遞',
  interview: '面試中',
  not_interested: '不感興趣',
}

type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  collectedAt?: string
  status?: string
  aiScore?: AiScore
}

function resolveStatus(status?: string): JobStatus {
  const valid: JobStatus[] = [
    'not_applied',
    'applied',
    'interview',
    'not_interested',
  ]

  if (status && valid.includes(status as JobStatus)) {
    return status as JobStatus
  }

  return 'not_applied'
}

function getStatusBadgeClass(status: JobStatus) {
  switch (status) {
    case 'applied':
      return 'border-blue-800 bg-blue-950/40 text-blue-300'
    case 'interview':
      return 'border-amber-800 bg-amber-950/40 text-amber-300'
    case 'not_interested':
      return 'border-slate-600 bg-slate-800/80 text-slate-400'
    default:
      return 'border-slate-700 bg-slate-800 text-slate-300'
  }
}

function getScoreColor(score?: number) {
  if (!score) {
    return 'text-slate-500'
  }

  if (score >= 85) {
    return 'text-emerald-300'
  }

  if (score >= 75) {
    return 'text-yellow-300'
  }

  return 'text-slate-300'
}

function getScoreBoxClass(score?: number) {
  if (!score) {
    return 'border-slate-700 bg-slate-950'
  }

  if (score >= 85) {
    return 'border-emerald-800 bg-emerald-950/20'
  }

  if (score >= 75) {
    return 'border-yellow-800 bg-yellow-950/20'
  }

  return 'border-slate-700 bg-slate-950'
}


type JobsApiResponse = {
  success: boolean
  count?: number
  jobs?: Job[]
  error?: string
}

async function readJsonSafely(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`API 回傳不是合法 JSON：${text}`)
  }
}

function formatDate(value?: string) {
  if (!value) {
    return '未知時間'
  }

  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadJobs() {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/jobs', {
        cache: 'no-store',
      })

      const data = (await readJsonSafely(response)) as JobsApiResponse | null

      if (!response.ok) {
        throw new Error(data?.error || '讀取職缺失敗')
      }

      setJobs(data?.jobs || [])
    } catch (error) {
      console.error('讀取職缺失敗:', error)
      setError(error instanceof Error ? error.message : '讀取職缺失敗')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteJob(jobId: string) {
    const confirmed = window.confirm('確定要刪除這筆職缺嗎？刪除後無法復原。')

    if (!confirmed) {
      return
    }

    try {
      setError(null)
      setDeletingId(jobId)

      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
      })

      const data = (await readJsonSafely(response)) as {
        success?: boolean
        error?: string
        deletedId?: string
        remaining?: number
      } | null
      

      if (!response.ok) {
        throw new Error(data?.error || '刪除失敗')
      }

      setJobs((currentJobs) => currentJobs.filter((job) => job.id !== jobId))
    } catch (error) {
      console.error('刪除失敗:', error)
      setError(error instanceof Error ? error.message : '刪除失敗')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-400">JobFit AI</p>
            <h1 className="mt-2 text-3xl font-bold">職缺採集儀表板</h1>
            <p className="mt-2 text-slate-400">
              目前已採集 {jobs.length} 筆職缺資料
            </p>
          </div>

          <button
            type="button"
            onClick={loadJobs}
            disabled={isLoading}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '重新整理中...' : '重新整理'}
          </button>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">職缺數量</p>
            <p className="mt-3 text-3xl font-bold">{jobs.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">資料來源</p>
            <p className="mt-3 text-3xl font-bold">Local</p>
          </div>

      
        </section>

        {error && (
          <section className="mb-6 rounded-2xl border border-red-700 bg-red-950/50 p-6 text-red-100">
            <h2 className="font-bold">操作失敗</h2>
            <p className="mt-2 text-sm">{error}</p>
          </section>
        )}

        {jobs.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
            目前沒有職缺資料。請先使用 Chrome Extension 採集職缺。
          </section>
        ) : (
          <section className="space-y-5">
            {jobs.map((job) => {
              const status = resolveStatus(job.status)

              return (
              <article
                key={job.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"
              >
                <div className="mb-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <h2 className="text-2xl font-bold leading-relaxed">
                      {job.title || '未命名職缺'}
                    </h2>
                    <span
                      className={`mt-1 rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(status)}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-400">
                    <span className="rounded-full bg-slate-800 px-3 py-1">
                      採集時間：{formatDate(job.collectedAt)}
                    </span>

                    <span className="rounded-full bg-slate-800 px-3 py-1">
                      ID：{job.id}
                    </span>

                    {job.source && (
                      <span className="rounded-full bg-slate-800 px-3 py-1">
                        來源：{job.source}
                      </span>
                    )}
                  </div>
                </div>

                {job.rawText && (
                  <p className="mb-5 line-clamp-3 text-sm leading-7 text-slate-300">
                    {job.rawText}
                  </p>
                )}

                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-5 inline-block text-sm font-semibold text-blue-400 hover:text-blue-300"
                  >
                    開啟原始頁面
                  </a>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/jobs/${encodeURIComponent(job.id)}`}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
                  >
                    查看詳情 / AI 分析
                  </Link>
                  <div
  className={`mt-4 rounded-xl border p-4 ${getScoreBoxClass(
    job.aiScore?.score
  )}`}
>
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
    AI 適合度
  </p>

  {job.aiScore ? (
    <>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <span
          className={`text-3xl font-bold ${getScoreColor(
            job.aiScore.score
          )}`}
        >
          {job.aiScore.score}
        </span>

        <span className="pb-1 text-sm text-slate-400">/ 100</span>

        <span className="pb-1 text-sm font-semibold text-slate-200">
          {job.aiScore.level}
        </span>
      </div>

      {job.aiScore.generatedAt && (
        <p className="mt-2 text-xs text-slate-500">
          分析時間：{new Date(job.aiScore.generatedAt).toLocaleString()}
        </p>
      )}
    </>
  ) : (
    <p className="mt-2 text-sm text-slate-500">待分析</p>
  )}
</div>


                  <button
                    type="button"
                    onClick={() => handleDeleteJob(job.id)}
                    disabled={deletingId === job.id}
                    className="rounded-xl border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === job.id ? '刪除中...' : '刪除'}
                  </button>
                </div>
              </article>
            )})}
          </section>
        )}
      </div>
    </main>
  )
}
