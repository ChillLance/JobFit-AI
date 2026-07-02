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
      accent: 'border-slate-700/80 bg-slate-900/60',
      valueClass: 'text-slate-100',
    },
    {
      key: 'high-match',
      label: d.highMatch,
      value: String(stats.highMatchJobs),
      description: d.highMatchDesc,
      accent: 'border-emerald-900/70 bg-emerald-950/30',
      valueClass: 'text-emerald-300',
    },
    {
      key: 'applied',
      label: d.applied,
      value: String(stats.appliedJobs),
      description: d.appliedDesc,
      accent: 'border-cyan-900/70 bg-cyan-950/30',
      valueClass: 'text-cyan-300',
    },
    {
      key: 'interviewing',
      label: d.interviewing,
      value: String(stats.interviewingJobs),
      description: d.interviewingDesc,
      accent: 'border-amber-900/70 bg-amber-950/30',
      valueClass: 'text-amber-300',
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
      accent: 'border-orange-900/70 bg-orange-950/30',
      valueClass: 'text-orange-300',
    },
    {
      key: 'risky',
      label: d.risky,
      value: String(stats.riskyJobs),
      description: d.riskyDesc,
      accent: 'border-rose-900/70 bg-rose-950/30',
      valueClass: 'text-rose-300',
    },
  ]

  return (
    <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`rounded-2xl border p-5 shadow-sm ${card.accent}`}
        >
          <p className="text-sm font-medium text-slate-400">{card.label}</p>
          <p className={`mt-2 text-3xl font-bold ${card.valueClass}`}>
            {card.value}
          </p>
          <p className="mt-2 text-sm text-slate-500">{card.description}</p>
          {card.hint && (
            <p className="mt-1 text-xs font-medium text-slate-500">
              {card.hint}
            </p>
          )}
        </div>
      ))}
    </section>
  )
}
