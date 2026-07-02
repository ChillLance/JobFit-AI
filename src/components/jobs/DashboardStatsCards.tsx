'use client'

import type { DashboardStats } from '@/lib/jobs/getDashboardStats'
import { getUiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'

type DashboardStatsCardsProps = {
  stats: DashboardStats
}

type StatCard = {
  key: string
  label: string
  value: string
  description: string
  hint?: string
  accent: string
  valueClass: string
}

export default function DashboardStatsCards({
  stats,
}: DashboardStatsCardsProps) {
  const { language } = useAppLanguage()
  const copy = getUiCopy(language)
  const d = copy.dashboard

  const cards: StatCard[] = [
    {
      key: 'total',
      label: d.totalJobs,
      value: String(stats.totalJobs),
      description: d.totalJobsDesc,
      hint: stats.recentJobs > 0 ? d.recentJobsHint(stats.recentJobs) : undefined,
      accent: 'border-stone-300/80 bg-stone-50',
      valueClass: 'text-ink',
    },
    {
      key: 'high-match',
      label: d.highMatch,
      value: String(stats.highMatchJobs),
      description: d.highMatchDesc,
      accent: 'border-emerald-200 bg-emerald-50',
      valueClass: 'text-emerald-700',
    },
    {
      key: 'applied',
      label: d.applied,
      value: String(stats.appliedJobs),
      description: d.appliedDesc,
      accent: 'border-cyan-200 bg-cyan-50',
      valueClass: 'text-cyan-700',
    },
    {
      key: 'interviewing',
      label: d.interviewing,
      value: String(stats.interviewingJobs),
      description: d.interviewingDesc,
      accent: 'border-amber-200 bg-amber-50',
      valueClass: 'text-amber-700',
    },
    {
      key: 'average-score',
      label: d.averageScore,
      value: stats.averageScore === null ? '-' : String(stats.averageScore),
      description: d.averageScoreDesc,
      hint:
        stats.unanalyzedJobs > 0
          ? d.unanalyzedHint(stats.unanalyzedJobs)
          : undefined,
      accent: 'border-orange-200 bg-orange-50',
      valueClass: 'text-orange-700',
    },
    {
      key: 'risky',
      label: d.risky,
      value: String(stats.riskyJobs),
      description: d.riskyDesc,
      accent: 'border-rose-200 bg-rose-50',
      valueClass: 'text-rose-700',
    },
  ]

  return (
    <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`rounded-2xl border p-5 shadow-sm ${card.accent}`}
        >
          <p className="text-sm font-medium text-stone-500">{card.label}</p>
          <p className={`mt-2 text-3xl font-bold ${card.valueClass}`}>
            {card.value}
          </p>
          <p className="mt-2 text-sm text-stone-400">{card.description}</p>
          {card.hint && (
            <p className="mt-1 text-xs font-medium text-stone-400">
              {card.hint}
            </p>
          )}
        </div>
      ))}
    </section>
  )
}
