'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { FitLevel } from '@/types/analysis'
import {
  getFitLevelLabel,
  getProviderLabel,
  getPrimaryAnalysis,
  getScoreColorClass,
} from '@/lib/analysis/normalizeAnalysis'
import {
  getJobDisplayScore,
  jobHasRisk,
} from '@/lib/jobs/getJobDisplayScore'
import {
  filterAndSortJobs,
  type JobSortKey,
  type ScoreFilter,
} from '@/lib/jobs/filterJobs'
import { getDashboardStats } from '@/lib/jobs/getDashboardStats'
import DashboardStatsCards from '@/components/jobs/DashboardStatsCards'

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
  aiScore?: unknown
  deepAnalysis?: unknown
  groqAnalysis?: unknown
  localAnalysis?: unknown
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

type StatusFilter = 'all' | JobStatus

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'not_applied', label: '未投遞' },
  { value: 'applied', label: '已投遞' },
  { value: 'interview', label: '面試中' },
  { value: 'not_interested', label: '不感興趣' },
]

const SCORE_FILTERS: { value: ScoreFilter; label: string }[] = [
  { value: 'all', label: '全部分數' },
  { value: 'high', label: '高匹配 (≥80)' },
  { value: 'medium', label: '中匹配 (60-79)' },
  { value: 'low', label: '低匹配 (<60)' },
  { value: 'unanalyzed', label: '未分析' },
]

const SORT_OPTIONS: { value: JobSortKey; label: string }[] = [
  { value: 'newest', label: '最新新增' },
  { value: 'oldest', label: '最舊新增' },
  { value: 'score_desc', label: '分數高到低' },
  { value: 'score_asc', label: '分數低到高' },
  { value: 'company_asc', label: '公司 A-Z' },
  { value: 'title_asc', label: '職稱 A-Z' },
]

const SCORE_FILTER_LABELS: Record<ScoreFilter, string> = {
  all: '全部分數',
  high: '高匹配',
  medium: '中匹配',
  low: '低匹配',
  unanalyzed: '未分析',
}

function countJobsByStatus(jobs: Job[]) {
  const counts: Record<StatusFilter, number> = {
    all: jobs.length,
    not_applied: 0,
    applied: 0,
    interview: 0,
    not_interested: 0,
  }

  for (const job of jobs) {
    counts[resolveStatus(job.status)] += 1
  }

  return counts
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

function getScoreBoxClass(level: FitLevel) {
  switch (level) {
    case 'excellent':
      return 'border-emerald-800 bg-emerald-950/20'
    case 'good':
      return 'border-amber-800 bg-amber-950/20'
    case 'fair':
      return 'border-sky-800 bg-sky-950/20'
    case 'poor':
      return 'border-rose-800 bg-rose-950/20'
    default:
      return 'border-slate-700 bg-slate-950'
  }
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all')
  const [riskOnly, setRiskOnly] = useState(false)
  const [sortKey, setSortKey] = useState<JobSortKey>('newest')

  const statusCounts = countJobsByStatus(jobs)

  // Dashboard stats are computed over ALL jobs (not the filtered view) so they
  // reflect the overall job-search state and stay stable while filtering.
  const dashboardStats = useMemo(() => getDashboardStats(jobs), [jobs])

  const filteredJobs = useMemo(
    () =>
      filterAndSortJobs(
        jobs,
        {
          search: searchQuery,
          status: statusFilter,
          score: scoreFilter,
          riskOnly,
          sort: sortKey,
        },
        {
          getScore: (job) => getJobDisplayScore(job).score,
          getHasRisk: (job) => jobHasRisk(job),
          getStatus: (job) => resolveStatus(job.status),
        }
      ),
    [jobs, searchQuery, statusFilter, scoreFilter, riskOnly, sortKey]
  )

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    scoreFilter !== 'all' ||
    riskOnly

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setScoreFilter('all')
    setRiskOnly(false)
    setSortKey('newest')
  }

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

        <DashboardStatsCards stats={dashboardStats} />

        {error && (
          <section className="mb-6 rounded-2xl border border-red-700 bg-red-950/50 p-6 text-red-100">
            <h2 className="font-bold">操作失敗</h2>
            <p className="mt-2 text-sm">{error}</p>
          </section>
        )}

        {jobs.length > 0 && (
          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label
                  htmlFor="job-search"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  搜尋
                </label>
                <input
                  id="job-search"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜尋職稱、公司、地點..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="score-filter"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  分數
                </label>
                <select
                  id="score-filter"
                  value={scoreFilter}
                  onChange={(event) =>
                    setScoreFilter(event.target.value as ScoreFilter)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none lg:w-auto"
                >
                  {SCORE_FILTERS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sort-select"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  排序
                </label>
                <select
                  id="sort-select"
                  value={sortKey}
                  onChange={(event) =>
                    setSortKey(event.target.value as JobSortKey)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none lg:w-auto"
                >
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-300 transition hover:border-slate-600">
                <input
                  type="checkbox"
                  checked={riskOnly}
                  onChange={(event) => setRiskOnly(event.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                只看有風險
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_FILTERS.map(({ value, label }) => {
                const isActive = statusFilter === value

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    {label}
                    <span className="ml-1.5 opacity-80">
                      ({statusCounts[value]})
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="text-slate-400">
                顯示 {filteredJobs.length} / {jobs.length} 個職缺
              </span>

              {hasActiveFilters && (
                <>
                  {searchQuery.trim() !== '' && (
                    <span className="text-slate-400">
                      搜尋：「{searchQuery.trim()}」
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="text-slate-400">
                      狀態：{STATUS_LABELS[statusFilter]}
                    </span>
                  )}
                  {scoreFilter !== 'all' && (
                    <span className="text-slate-400">
                      分數：{SCORE_FILTER_LABELS[scoreFilter]}
                    </span>
                  )}
                  {riskOnly && <span className="text-slate-400">只看有風險</span>}

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-lg border border-slate-600 px-3 py-1 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    清除篩選
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {jobs.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
            目前沒有職缺資料。請先使用 Chrome Extension 採集職缺。
          </section>
        ) : filteredJobs.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
            <h2 className="text-lg font-bold text-slate-200">
              找不到符合條件的職缺
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              請調整搜尋字詞或清除篩選條件。
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              清除篩選
            </button>
          </section>
        ) : (
          <section className="space-y-5">
            {filteredJobs.map((job) => {
              const status = resolveStatus(job.status)
              const primary = getPrimaryAnalysis(job)
              const fitLevel = primary?.fitLevel ?? 'unknown'

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

                <div
                  className={`mb-4 rounded-xl border p-4 ${getScoreBoxClass(
                    fitLevel
                  )}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    AI 適合度
                  </p>

                  {primary && primary.fitScore !== null ? (
                    <>
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        <span
                          className={`text-3xl font-bold ${getScoreColorClass(
                            primary.fitScore
                          )}`}
                        >
                          {primary.fitScore}
                        </span>

                        <span className="pb-1 text-sm text-slate-400">/ 100</span>

                        <span className="pb-1 text-sm font-semibold text-slate-200">
                          {getFitLevelLabel(primary.fitLevel)}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {getProviderLabel(primary.metadata.provider)}
                      </p>

                      {primary.metadata.createdAt && (
                        <p className="mt-1 text-xs text-slate-500">
                          分析時間：
                          {new Date(primary.metadata.createdAt).toLocaleString()}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">待分析</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/jobs/${encodeURIComponent(job.id)}`}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
                  >
                    查看詳情 / 分析中心
                  </Link>

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
