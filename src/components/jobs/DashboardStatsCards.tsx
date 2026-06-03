// Dashboard stats cards for the home page (TASK-024).
// Presentational only — receives the already-computed stats and renders a
// responsive grid of cards. No data fetching, no AI calls.

import type { DashboardStats } from '@/lib/jobs/getDashboardStats'

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
  const cards: StatCard[] = [
    {
      key: 'total',
      label: '總職缺',
      value: String(stats.totalJobs),
      description: '已收集的職缺數',
      hint: stats.recentJobs > 0 ? `近 7 天新增：${stats.recentJobs}` : undefined,
      accent: 'border-slate-700/80 bg-slate-900/60',
      valueClass: 'text-slate-100',
    },
    {
      key: 'high-match',
      label: '高匹配',
      value: String(stats.highMatchJobs),
      description: 'AI 分數 ≥ 80',
      accent: 'border-emerald-900/70 bg-emerald-950/30',
      valueClass: 'text-emerald-300',
    },
    {
      key: 'applied',
      label: '已投遞',
      value: String(stats.appliedJobs),
      description: '已送出申請',
      accent: 'border-cyan-900/70 bg-cyan-950/30',
      valueClass: 'text-cyan-300',
    },
    {
      key: 'interviewing',
      label: '面試中',
      value: String(stats.interviewingJobs),
      description: '進行中的面試流程',
      accent: 'border-amber-900/70 bg-amber-950/30',
      valueClass: 'text-amber-300',
    },
    {
      key: 'average-score',
      label: '平均分數',
      value: stats.averageScore === null ? '-' : String(stats.averageScore),
      description: '已分析職缺平均匹配度',
      hint:
        stats.unanalyzedJobs > 0 ? `未分析：${stats.unanalyzedJobs}` : undefined,
      accent: 'border-violet-900/70 bg-violet-950/30',
      valueClass: 'text-violet-300',
    },
    {
      key: 'risky',
      label: '有風險',
      value: String(stats.riskyJobs),
      description: '偵測到需確認條件',
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
