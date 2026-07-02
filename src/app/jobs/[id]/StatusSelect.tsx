'use client'

import { useState } from 'react'
import { getUiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'

export const JOB_STATUSES = [
  'not_applied',
  'applied',
  'interview',
  'not_interested',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

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
  const { language } = useAppLanguage()
  const copy = getUiCopy(language)
  const s = copy.jobDetail.statusSection
  const statusCopy = copy.status

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
    <section className="mb-6 rounded-2xl border border-stone-200 bg-paper p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{s.title}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {s.current(statusCopy[status])}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleChange(e.target.value as JobStatus)}
            disabled={isSaving}
            className="rounded-xl border border-stone-300 bg-washi px-4 py-2 text-sm text-ink transition focus:border-orange-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {JOB_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusCopy[value]}
              </option>
            ))}
          </select>

          {isSaving && (
            <span className="text-sm text-stone-500">{s.saving}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-bold">更新狀態失敗</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
    </section>
  )
}
