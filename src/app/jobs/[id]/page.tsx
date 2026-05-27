import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import { ScorePanel } from './ScorePanel'
import { StatusSelect, type JobStatus } from './StatusSelect'

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

type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  collectedAt?: string
  status?: JobStatus
  statusUpdatedAt?: string
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

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <p className="text-sm font-semibold text-blue-400">
            JobFit AI 職缺詳情
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-relaxed">
            {job.title || '未命名職缺'}
          </h1>

          <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-400">
            <span className="rounded-full bg-slate-800 px-3 py-1">
              ID：{job.id}
            </span>

            <span className="rounded-full bg-slate-800 px-3 py-1">
              採集時間：{formatDate(job.collectedAt)}
            </span>

            {job.source && (
              <span className="rounded-full bg-slate-800 px-3 py-1">
                來源：{job.source}
              </span>
            )}

            <span className="rounded-full bg-slate-800 px-3 py-1">
              內容字數：{job.rawText ? job.rawText.length.toLocaleString() : 0} 字
            </span>
          </div>
        </section>

        <StatusSelect
          jobId={job.id}
          initialStatus={resolveStatus(job.status)}
        />

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">AI 適合度</p>
            <p className="mt-3 text-3xl font-bold text-slate-500">待評分</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">摘要狀態</p>
            <p className="mt-3 text-3xl font-bold text-slate-500">待生成</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">履歷匹配</p>
            <p className="mt-3 text-3xl font-bold text-slate-500">待分析</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">AI Job Fit Analysis</h2>
              <p className="mt-1 text-sm text-slate-400">
                未來版本會根據這份職缺內容與你的{' '}
                <span className="font-semibold">user_profile.json</span> 做深度比對，提供更精準的職缺適合度分析。
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                disabled
                className="inline-flex items-center rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 opacity-60 shadow-sm"
              >
                Analyze Fit
              </button>
              <p className="text-xs text-slate-500">Coming in MVP 0.3</p>
            </div>
          </div>
        </section>

        <ScorePanel jobId={job.id} initialScore={job.aiScore || null} />

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">完整職缺內容</h2>
              <p className="mt-1 text-sm text-slate-400">
                這是 Chrome Extension 採集到的原始文字內容。
              </p>
            </div>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-400">
              {job.rawText ? job.rawText.length.toLocaleString() : 0} 字
            </span>
          </div>

          {job.rawText ? (
            <div className="max-h-screen overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-200">
              {job.rawText}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
              這筆職缺沒有原始內容。
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
