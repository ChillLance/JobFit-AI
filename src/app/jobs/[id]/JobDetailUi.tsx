'use client'

import Link from 'next/link'
import { getUiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'
import type { JobStatus } from './StatusSelect'

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

function formatDate(value: string | undefined, unknownLabel: string) {
  if (!value) return unknownLabel
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

type JobData = {
  id: string
  title?: string
  url?: string
  rawText?: string
  company?: string
  location?: string
  employmentType?: string
  salary?: string
  source?: string
  collectedAt?: string
}

export function JobNotFound({ id }: { id: string }) {
  const { language } = useAppLanguage()
  const j = getUiCopy(language).jobDetail

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-6 inline-block rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          {j.backToList}
        </Link>

        <section className="rounded-2xl border border-red-800 bg-red-950/40 p-8">
          <p className="text-sm text-red-300">{j.notFoundLabel}</p>
          <h1 className="mt-3 text-3xl font-bold">{j.notFoundTitle}</h1>
          <p className="mt-4 break-all text-slate-300">ID：{id}</p>
        </section>
      </div>
    </main>
  )
}

export function JobDetailHeader({
  job,
  status,
}: {
  job: JobData
  status: JobStatus
}) {
  const { language } = useAppLanguage()
  const copy = getUiCopy(language)
  const j = copy.jobDetail

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
        >
          {j.backToList}
        </Link>

        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            {j.openOriginal}
          </a>
        )}
      </div>

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-orange-400">{j.pageLabel}</p>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}
          >
            {copy.status[status]}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold leading-relaxed">
          {job.title || copy.common.unnamedJob}
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
            {j.collectedAt}
            {formatDate(job.collectedAt, copy.common.unknownTime)}
          </span>
        </div>
      </section>
    </>
  )
}

export function JobDetailSections({ job }: { job: JobData }) {
  const { language } = useAppLanguage()
  const copy = getUiCopy(language)
  const j = copy.jobDetail
  const f = j.fields

  const charCount = job.rawText ? job.rawText.length.toLocaleString() : '0'

  const overviewItems: { label: string; value: string }[] = [
    job.company ? { label: f.company, value: job.company } : null,
    job.location ? { label: f.location, value: job.location } : null,
    job.employmentType
      ? { label: f.employmentType, value: job.employmentType }
      : null,
    job.salary ? { label: f.salary, value: job.salary } : null,
    job.source ? { label: f.source, value: job.source } : null,
    {
      label: f.collectedAt,
      value: formatDate(job.collectedAt, copy.common.unknownTime),
    },
    {
      label: f.charCount,
      value: j.charCount(Number(charCount.replace(/,/g, '')) || 0),
    },
    { label: f.id, value: job.id },
  ].filter(
    (item): item is { label: string; value: string } => item !== null
  )

  return (
    <>
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">{j.overviewTitle}</h2>
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

      <details className="group rounded-2xl border border-slate-800 bg-slate-900">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl p-6 transition hover:bg-slate-900/60">
          <div>
            <h2 className="text-xl font-bold">{j.rawContentTitle}</h2>
            <p className="mt-1 text-sm text-slate-400">{j.rawContentDesc}</p>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
            <span>{j.charCount(Number(charCount.replace(/,/g, '')) || 0)}</span>
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
              {j.noRawContent}
            </div>
          )}
        </div>
      </details>
    </>
  )
}
