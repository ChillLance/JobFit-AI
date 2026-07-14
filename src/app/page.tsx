'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { FitLevel } from '@/types/analysis'
import type { AppLanguage } from '@/lib/appLanguage'
import {
  getFitLevel,
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
import { estimateMonthlySavings } from '@/lib/jobs/savings'
import { getDashboardStats } from '@/lib/jobs/getDashboardStats'
import DashboardStatsCards from '@/components/jobs/DashboardStatsCards'
import { getUiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'
import { ToriiIcon } from '@/components/ToriiIcon'
import type { JobExtraction } from '@/types/extraction'

type JobStatus =
  | 'not_applied'
  | 'applied'
  | 'interview'
  | 'not_interested'

type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  collectedAt?: string
  // Optional structured fields — rendered only when present on the record.
  company?: string
  location?: string
  employmentType?: string
  salary?: string
  status?: string
  // Structured LLM extraction (present for some jobs — see
  // src/types/extraction.ts). Used to derive the estimated-savings chip.
  extraction?: JobExtraction | null
  aiScore?: unknown
  deepAnalysis?: unknown
  groqAnalysis?: unknown
  localAnalysis?: unknown
  analysis?: unknown
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
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'interview':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'not_interested':
      return 'border-stone-400 bg-stone-100/80 text-stone-500'
    default:
      return 'border-stone-300 bg-stone-100 text-stone-600'
  }
}

function getScoreBoxClass(level: FitLevel) {
  switch (level) {
    case 'excellent':
      return 'border-emerald-200 bg-emerald-50'
    case 'good':
      return 'border-amber-200 bg-amber-50'
    case 'fair':
      return 'border-sky-200 bg-sky-50'
    case 'poor':
      return 'border-rose-200 bg-rose-50'
    default:
      return 'border-stone-300 bg-washi'
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

function formatDate(value: string | undefined, language: AppLanguage, unknownTime: string) {
  if (!value) {
    return unknownTime
  }

  try {
    return new Date(value).toLocaleString(language)
  } catch {
    return value
  }
}

export default function HomePage() {
  const { language } = useAppLanguage()
  const copy = getUiCopy(language)
  const h = copy.home
  const statusCopy = copy.status

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: statusCopy.all },
    { value: 'not_applied', label: statusCopy.not_applied },
    { value: 'applied', label: statusCopy.applied },
    { value: 'interview', label: statusCopy.interview },
    { value: 'not_interested', label: statusCopy.not_interested },
  ]

  const scoreFilters: { value: ScoreFilter; label: string }[] = [
    { value: 'all', label: h.scoreFilters.all },
    { value: 'high', label: h.scoreFilters.high },
    { value: 'medium', label: h.scoreFilters.medium },
    { value: 'low', label: h.scoreFilters.low },
    { value: 'unanalyzed', label: h.scoreFilters.unanalyzed },
  ]

  const sortOptions: { value: JobSortKey; label: string }[] = [
    { value: 'newest', label: h.sortOptions.newest },
    { value: 'oldest', label: h.sortOptions.oldest },
    { value: 'score_desc', label: h.sortOptions.scoreDesc },
    { value: 'score_asc', label: h.sortOptions.scoreAsc },
    { value: 'salary_desc', label: h.sortOptions.salaryDesc },
    { value: 'salary_asc', label: h.sortOptions.salaryAsc },
    { value: 'savings_desc', label: h.sortOptions.savingsDesc },
    { value: 'company_asc', label: h.sortOptions.companyAsc },
    { value: 'title_asc', label: h.sortOptions.titleAsc },
  ]

  const scoreFilterShort = h.scoreFilterShort

  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false)
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

  async function handleAnalyzeAllLocally() {
    try {
      setIsAnalyzingAll(true)
      setError(null)

      const response = await fetch('/api/jobs/analyze-local-all', {
        method: 'POST',
      })

      const data = (await readJsonSafely(response)) as {
        analyzed?: number
        error?: string
      } | null

      if (!response.ok) {
        throw new Error(data?.error || '本地分析失敗')
      }

      await loadJobs()
      // This is the point of the one-click workflow: after a full local
      // analysis pass, surface the highest-scoring jobs first so AI analysis
      // quota can be prioritized toward them.
      setSortKey('score_desc')
    } catch (error) {
      console.error('本地分析失敗:', error)
      setError(error instanceof Error ? error.message : '本地分析失敗')
    } finally {
      setIsAnalyzingAll(false)
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
    // Fetch the job list once on mount; loadJobs sets state from the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJobs()
  }, [])

  return (
    <main className="min-h-screen bg-washi px-6 py-8 text-ink">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-paper p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
              {h.brand}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
              {h.title}
            </h1>
            <p className="mt-2 text-stone-500">{h.subtitle(jobs.length)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/profiles"
              className="rounded-xl border border-stone-300 bg-stone-100 px-5 py-3 font-semibold text-ink transition hover:border-stone-400 hover:bg-stone-200"
            >
              {h.manageProfiles}
            </Link>

            <Link
              href="/profiles/import"
              className="rounded-xl border border-orange-600 bg-orange-600/10 px-5 py-3 font-semibold text-orange-800 transition hover:bg-orange-600/20"
            >
              {h.importFromAi}
            </Link>

            <button
              type="button"
              onClick={handleAnalyzeAllLocally}
              disabled={isAnalyzingAll || isLoading || jobs.length === 0}
              className="rounded-xl border border-orange-600 bg-orange-600/10 px-5 py-3 font-semibold text-orange-800 transition hover:bg-orange-600/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAnalyzingAll ? h.analyzeAllLocalProgress : h.analyzeAllLocal}
            </button>

            <button
              type="button"
              onClick={loadJobs}
              disabled={isLoading}
              className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? copy.common.refreshing : copy.common.refresh}
            </button>
          </div>
        </header>

        <DashboardStatsCards stats={dashboardStats} />

        {error && (
          <section className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-900">
            <h2 className="font-bold">操作失敗</h2>
            <p className="mt-2 text-sm">{error}</p>
          </section>
        )}

        {jobs.length > 0 && (
          <section className="mb-6 rounded-2xl border border-stone-200 bg-paper p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label
                  htmlFor="job-search"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  {h.searchLabel}
                </label>
                <input
                  id="job-search"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={h.searchPlaceholder}
                  className="w-full rounded-xl border border-stone-300 bg-washi px-4 py-2.5 text-sm text-white placeholder:text-stone-400 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="score-filter"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  {h.scoreLabel}
                </label>
                <select
                  id="score-filter"
                  value={scoreFilter}
                  onChange={(event) =>
                    setScoreFilter(event.target.value as ScoreFilter)
                  }
                  className="w-full rounded-xl border border-stone-300 bg-washi px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none lg:w-auto"
                >
                  {scoreFilters.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sort-select"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  {h.sortLabel}
                </label>
                <select
                  id="sort-select"
                  value={sortKey}
                  onChange={(event) =>
                    setSortKey(event.target.value as JobSortKey)
                  }
                  className="w-full rounded-xl border border-stone-300 bg-washi px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none lg:w-auto"
                >
                  {sortOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-washi px-4 py-2.5 text-sm text-stone-600 transition hover:border-stone-400">
                <input
                  type="checkbox"
                  checked={riskOnly}
                  onChange={(event) => setRiskOnly(event.target.checked)}
                  className="h-4 w-4 accent-orange-600"
                />
                {h.riskOnly}
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {statusFilters.map(({ value, label }) => {
                const isActive = statusFilter === value

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'border-orange-500 bg-orange-600 text-white'
                        : 'border-stone-300 bg-paper text-stone-600 hover:border-stone-400 hover:bg-stone-100'
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
              <span className="text-stone-500">
                {h.showingCount(filteredJobs.length, jobs.length)}
              </span>

              {hasActiveFilters && (
                <>
                  {searchQuery.trim() !== '' && (
                    <span className="text-stone-500">
                      {h.searchActive(searchQuery.trim())}
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="text-stone-500">
                      {h.statusFilter(statusCopy[statusFilter])}
                    </span>
                  )}
                  {scoreFilter !== 'all' && (
                    <span className="text-stone-500">
                      {h.scoreFilter(scoreFilterShort[scoreFilter])}
                    </span>
                  )}
                  {riskOnly && (
                    <span className="text-stone-500">{h.riskOnly}</span>
                  )}

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-lg border border-stone-400 px-3 py-1 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:bg-stone-100"
                  >
                    {copy.common.clearFilters}
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {jobs.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600">
              <ToriiIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-stone-700">
              {h.emptyTitle}
            </h2>
            <p className="mt-2 text-sm text-stone-500">{h.emptyDescription}</p>
            <button
              type="button"
              onClick={loadJobs}
              disabled={isLoading}
              className="mt-5 rounded-xl border border-stone-400 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? copy.common.refreshing : copy.common.refresh}
            </button>
          </section>
        ) : filteredJobs.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-stone-100 text-xl text-stone-500">
              ⌕
            </div>
            <h2 className="mt-4 text-lg font-bold text-stone-700">
              {h.noMatchTitle}
            </h2>
            <p className="mt-2 text-sm text-stone-500">{h.noMatchDescription}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl border border-stone-400 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:bg-stone-100"
            >
              {copy.common.clearFilters}
            </button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredJobs.map((job) => {
              const status = resolveStatus(job.status)
              // Pass raw analysis fields straight through; getPrimaryAnalysis /
              // buildAnalysisComparison own the localAnalysis ?? analysis ?? aiScore
              // fallback, so the list, filters, and dashboard all agree.
              const analysisInput = {
                deepAnalysis: job.deepAnalysis,
                groqAnalysis: job.groqAnalysis,
                localAnalysis: job.localAnalysis,
                analysis: job.analysis,
                aiScore: job.aiScore,
              }
              const primary = getPrimaryAnalysis(analysisInput)
              // Use the same canonical score the filters / sort / dashboard use.
              const displayScore = getJobDisplayScore(analysisInput).score
              const fitLevel = getFitLevel(displayScore)
              const recommendation =
                primary?.recommendation || getFitLevelLabel(fitLevel)

              const savingsEstimate = estimateMonthlySavings(job)

              const metaChips = [
                job.company,
                job.location,
                job.employmentType,
                job.salary,
                savingsEstimate
                  ? h.savingsChip(savingsEstimate.savingsJpy)
                  : null,
                job.source ? `${h.sourcePrefix}${job.source}` : null,
                `${h.collectedPrefix}${formatDate(job.collectedAt, language, copy.common.unknownTime)}`,
              ].filter((value): value is string => Boolean(value))

              return (
                <article
                  key={job.id}
                  className="flex h-full flex-col rounded-2xl border border-stone-200 bg-paper p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md hover:shadow-orange-200/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 text-lg font-bold leading-snug">
                      {job.title || copy.common.unnamedJob}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}
                    >
                      {statusCopy[status]}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-stone-500">
                    {metaChips.map((chip, index) => (
                      <span
                        key={index}
                        className="max-w-[16rem] truncate rounded-full bg-stone-100 px-2.5 py-1"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  <div
                    className={`mt-4 flex items-center justify-between gap-3 rounded-xl border p-4 ${getScoreBoxClass(
                      fitLevel
                    )}`}
                  >
                    {displayScore !== null ? (
                      <>
                        <div className="flex items-end gap-2">
                          <span
                            className={`text-3xl font-bold ${getScoreColorClass(displayScore)}`}
                          >
                            {displayScore}
                          </span>
                          <span className="pb-1 text-xs text-stone-500">/ 100</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-ink">
                            {recommendation}
                          </p>
                          {primary && (
                            <p className="mt-0.5 text-xs text-stone-500">
                              {getProviderLabel(primary.metadata.provider)}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-stone-600">
                          {h.aiFitScore}
                        </span>
                        <span className="text-sm text-stone-400">
                          {h.pendingAnalysis}
                        </span>
                      </>
                    )}
                  </div>

                  {primary?.summary && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-500">
                      {primary.summary}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <Link
                      href={`/jobs/${encodeURIComponent(job.id)}`}
                      className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
                    >
                      {h.viewDetails}
                    </Link>

                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
                      >
                        {h.originalPage}
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteJob(job.id)}
                      disabled={deletingId === job.id}
                      className="ml-auto rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === job.id
                        ? copy.common.deleting
                        : copy.common.delete}
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
