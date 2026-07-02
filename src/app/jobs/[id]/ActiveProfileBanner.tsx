'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getActiveProfile, type JapanCareerProfile } from '@/lib/profile'
import { getUiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'

// Shows the active JapanCareerProfile used as the analysis baseline (TASK-029).
// profileStore relies on localStorage, so we only read it on the client after
// mount to avoid any SSR/hydration mismatch.
export function ActiveProfileBanner() {
  const { language } = useAppLanguage()
  const p = getUiCopy(language).jobDetail.activeProfile

  const [profile, setProfile] = useState<JapanCareerProfile | null>(null)

  useEffect(() => {
    function refresh() {
      setProfile(getActiveProfile())
    }
    refresh()
    // Re-read when the user returns from /profiles after switching active profile.
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const roles = profile?.target.desiredRoles?.filter(Boolean) ?? []
  const locations = profile?.target.desiredLocations?.filter(Boolean) ?? []
  const careerSummary =
    profile?.career.careerGoal?.trim() ||
    profile?.career.futureVision?.trim() ||
    ''

  return (
    <section className="mb-6 rounded-2xl border border-orange-900/50 bg-orange-950/20 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
            {p.label}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {profile ? profile.name : p.loading}
          </p>

          {profile && (
            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  {p.desiredRoles}
                </dt>
                <dd className="mt-0.5 text-slate-300">
                  {roles.length > 0 ? roles.slice(0, 6).join('、') : '—'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  {p.desiredLocations}
                </dt>
                <dd className="mt-0.5 text-slate-300">
                  {locations.length > 0 ? locations.join('、') : '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold uppercase tracking-wide text-slate-500">
                  {p.careerGoal}
                </dt>
                <dd className="mt-0.5 text-slate-300">
                  {careerSummary || '—'}
                </dd>
              </div>
            </dl>
          )}

          <p className="mt-2 text-xs text-slate-500">{p.footnote}</p>
        </div>

        <Link
          href="/profiles"
          className="shrink-0 rounded-full border border-orange-700 bg-orange-600/10 px-3 py-1.5 text-xs font-semibold text-orange-200 transition hover:bg-orange-600/20"
        >
          {p.manage}
        </Link>
      </div>
    </section>
  )
}
