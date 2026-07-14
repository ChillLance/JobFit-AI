'use client'

import Link from 'next/link'
import { getUiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'
import type { AppLanguage } from '@/lib/appLanguage'
import { ToriiIcon } from '@/components/ToriiIcon'
import type { JobStatus } from './StatusSelect'

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

function formatDate(value: string | undefined, unknownLabel: string, language: AppLanguage) {
  if (!value) return unknownLabel
  try {
    return new Date(value).toLocaleString(language)
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
    <main className="min-h-screen bg-washi px-6 py-8 text-ink">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-6 inline-block rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
        >
          {j.backToList}
        </Link>

        <section className="rounded-2xl border border-red-200 bg-red-50 p-8">
          <ToriiIcon className="h-8 w-8 text-red-300" />
          <p className="mt-3 text-sm text-red-700">{j.notFoundLabel}</p>
          <h1 className="mt-3 text-3xl font-bold">{j.notFoundTitle}</h1>
          <p className="mt-4 break-all text-stone-600">ID：{id}</p>
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
          className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:bg-stone-100"
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

      <section className="mb-6 rounded-2xl border border-stone-200 bg-paper p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-orange-600">{j.pageLabel}</p>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}
          >
            {copy.status[status]}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold leading-relaxed">
          {job.title || copy.common.unnamedJob}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-stone-500">
          {job.company && (
            <span className="rounded-full bg-stone-100 px-3 py-1">
              {job.company}
            </span>
          )}
          {job.location && (
            <span className="rounded-full bg-stone-100 px-3 py-1">
              {job.location}
            </span>
          )}
          {job.employmentType && (
            <span className="rounded-full bg-stone-100 px-3 py-1">
              {job.employmentType}
            </span>
          )}
          {job.salary && (
            <span className="rounded-full bg-stone-100 px-3 py-1">
              {job.salary}
            </span>
          )}
          <span className="rounded-full bg-stone-100 px-3 py-1">
            {j.collectedAt}
            {formatDate(job.collectedAt, copy.common.unknownTime, language)}
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
      value: formatDate(job.collectedAt, copy.common.unknownTime, language),
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
      <section className="mb-6 rounded-2xl border border-stone-200 bg-paper p-6">
        <h2 className="text-xl font-bold">{j.overviewTitle}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overviewItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-stone-200 bg-stone-100/60 p-4"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {item.label}
              </dt>
              <dd className="mt-1.5 break-words text-sm text-ink">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <details className="group rounded-2xl border border-stone-200 bg-paper">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl p-6 transition hover:bg-stone-50">
          <div>
            <h2 className="text-xl font-bold">{j.rawContentTitle}</h2>
            <p className="mt-1 text-sm text-stone-500">{j.rawContentDesc}</p>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
            <span>{j.charCount(Number(charCount.replace(/,/g, '')) || 0)}</span>
            <span className="text-stone-400 transition group-open:rotate-180">
              ▾
            </span>
          </span>
        </summary>

        <div className="px-6 pb-6">
          {job.rawText ? (
            <div className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-xl border border-stone-200 bg-washi p-5 text-sm leading-7 text-stone-700">
              {job.rawText}
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-washi p-5 text-sm text-stone-500">
              {j.noRawContent}
            </div>
          )}
        </div>
      </details>
    </>
  )
}
