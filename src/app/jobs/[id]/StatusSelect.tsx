'use client'

import { useState } from 'react'

export const JOB_STATUSES = [
  'not_applied',
  'applied',
  'interview',
  'not_interested',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

const STATUS_LABELS: Record<JobStatus, string> = {
  not_applied: '未投遞',
  applied: '已投遞',
  interview: '面試中',
  not_interested: '不感興趣',
}

type StatusApiResponse = {
  success: boolean
  job?: { status?: JobStatus; statusUpdatedAt?: string }
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

export function StatusSelect({
  jobId,
  initialStatus,
}: {
  jobId: string
  initialStatus: JobStatus
}) {
  const [status, setStatus] = useState<JobStatus>(initialStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(nextStatus: JobStatus) {
    if (nextStatus === status) {
      return
    }

    const previousStatus = status

    try {
      setIsSaving(true)
      setError(null)
      setStatus(nextStatus)

      const response = await fetch(
        `/api/jobs/${encodeURIComponent(jobId)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        }
      )

      const data = (await readJsonSafely(response)) as StatusApiResponse | null

      if (!response.ok) {
        throw new Error(data?.error || '更新狀態失敗')
      }

      if (data?.job?.status) {
        setStatus(data.job.status)
      }
    } catch (err) {
      console.error('更新狀態失敗:', err)
      setStatus(previousStatus)
      setError(err instanceof Error ? err.message : '更新狀態失敗')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">應徵狀態</h2>
          <p className="mt-1 text-sm text-slate-400">
            目前：{STATUS_LABELS[status]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleChange(e.target.value as JobStatus)}
            disabled={isSaving}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 transition focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {JOB_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>

          {isSaving && (
            <span className="text-sm text-slate-400">儲存中...</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-700 bg-red-950/50 p-4 text-sm text-red-100">
          <p className="font-bold">更新狀態失敗</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
    </section>
  )
}
