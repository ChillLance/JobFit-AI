import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import { StatusSelect, type JobStatus } from './StatusSelect'
import { AnalyzeFitPanel } from './AnalyzeFitPanel'
import { ActiveProfileBanner } from './ActiveProfileBanner'

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

type DeepAnalysis = {
  jobId: string
  analysisType: 'gemini-deep' | 'groq-deep'
  analysisVersion: string
  fitScore: number
  recommendedAction: string
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
    source?: 'gemini' | 'groq'
    provider?: 'gemini' | 'groq'
    model: string
    profileVersion: string | number
    createdAt: string
    cacheExpiresAt?: string
    inputMode?: string
    tokenStrategy?: string
  }
}

type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  collectedAt?: string
  // Optional structured fields — only present for some sources. Rendered when
  // available and otherwise skipped (current postings keep these inside rawText).
  company?: string
  location?: string
  employmentType?: string
  salary?: string
  status?: JobStatus
  statusUpdatedAt?: string
  aiScore?: AiScore
  deepAnalysis?: DeepAnalysis
  groqAnalysis?: DeepAnalysis
  analysis?: Record<string, unknown>
}

const STATUS_LABELS: Record<JobStatus, string> = {
  not_applied: '未投遞',
  applied: '已投遞',
  interview: '面試中',
  not_interested: '不感興趣',
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


const filePath = path.join(process.cwd(), 'jobs_temp.json')

function getJobs(): Job[] {
  try {
    if (!fs.existsSync(filePath)) {
      return []
    }

    const content = fs.readFileSync(filePath, 'utf-8')

    if (!content.trim()) {
      return []
    }

    const data = JSON.parse(content)

    if (!Array.isArray(data)) {
      return []
    }

    return data
  } catch (error) {
    console.error('讀取 jobs_temp.json 失敗:', error)
    return []
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

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const jobs = getJobs()
  const job = jobs.find((item) => item.id === id)

  if (!job) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="mb-6 inline-block rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            ← 回到職缺列表
          </Link>

          <section className="rounded-2xl border border-red-800 bg-red-950/40 p-8">
            <p className="text-sm text-red-300">找不到職缺</p>
            <h1 className="mt-3 text-3xl font-bold">
              這筆職缺不存在或已被刪除
            </h1>
            <p className="mt-4 break-all text-slate-300">
              ID：{id}
            </p>
          </section>
        </div>
      </main>
    )
  }

  const status = resolveStatus(job.status)

  // Structured fields are only shown when actually present on the record.
  const overviewItems: { label: string; value: string }[] = [
    job.company ? { label: '公司', value: job.company } : null,
    job.location ? { label: '地點', value: job.location } : null,
    job.employmentType
      ? { label: '雇用形態', value: job.employmentType }
      : null,
    job.salary ? { label: '薪資', value: job.salary } : null,
    job.source ? { label: '來源', value: job.source } : null,
    { label: '採集時間', value: formatDate(job.collectedAt) },
    {
      label: '內容字數',
      value: `${job.rawText ? job.rawText.length.toLocaleString() : 0} 字`,
    },
    { label: 'ID', value: job.id },
  ].filter(
    (item): item is { label: string; value: string } => item !== null
  )

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            ← 回到職缺列表
          </Link>

          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              開啟原始職缺
            </a>
          )}
        </div>

        {/* Title header — keeps the user oriented; full overview lives lower. */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-blue-400">
              JobFit AI 職缺詳情
            </p>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-bold leading-relaxed">
            {job.title || '未命名職缺'}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-400">
            {job.company && (
              <span className="rounded-full bg-slate-800 px-3 py-1">
                {job.company}
              </span>
            )}
            {job.location && (
              <span className="rounded-full bg-slate-800 px-3 py-1">
                {job.location}
              </span>
            )}
            {job.employmentType && (
              <span className="rounded-full bg-slate-800 px-3 py-1">
                {job.employmentType}
              </span>
            )}
            {job.salary && (
              <span className="rounded-full bg-slate-800 px-3 py-1">
                {job.salary}
              </span>
            )}
            <span className="rounded-full bg-slate-800 px-3 py-1">
              採集時間：{formatDate(job.collectedAt)}
            </span>
          </div>
        </section>

        {/* Active analysis profile (TASK-029) — actual active JapanCareerProfile. */}
        <ActiveProfileBanner />

        {/* AI analysis: recommendation, score / verdict, reasons, risks,
            actions, and model comparison. Renders gracefully when missing. */}
        <AnalyzeFitPanel
          jobId={job.id}
          initialDeepAnalysis={job.deepAnalysis ?? null}
          initialGroqAnalysis={job.groqAnalysis ?? null}
          initialLocalAnalysis={job.analysis ?? job.aiScore ?? null}
        />

        <StatusSelect jobId={job.id} initialStatus={status} />

        {/* Job overview — structured details + metadata. */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">職缺概覽</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overviewItems.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {item.label}
                </dt>
                <dd className="mt-1.5 break-words text-sm text-slate-100">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Original job posting — collapsed by default with a show/hide toggle. */}
        <details className="group rounded-2xl border border-slate-800 bg-slate-900">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl p-6 transition hover:bg-slate-900/60">
            <div>
              <h2 className="text-xl font-bold">完整原始職缺內容</h2>
              <p className="mt-1 text-sm text-slate-400">
                這是 Chrome Extension 採集到的原始文字內容，預設收合。
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
              <span>{job.rawText ? job.rawText.length.toLocaleString() : 0} 字</span>
              <span className="text-slate-500 transition group-open:rotate-180">
                ▾
              </span>
            </span>
          </summary>

          <div className="px-6 pb-6">
            {job.rawText ? (
              <div className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-200">
                {job.rawText}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
                這筆職缺沒有原始內容。
              </div>
            )}
          </div>
        </details>
      </div>
    </main>
  )
}
