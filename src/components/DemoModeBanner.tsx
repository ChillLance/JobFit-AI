'use client'

import { getUiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'

/** Public, site-wide disclosure for the ephemeral portfolio deployment. */
export function DemoModeBanner() {
  const { language } = useAppLanguage()
  const copy = getUiCopy(language)

  return (
    <div
      role="status"
      className="shrink-0 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-900"
    >
      {copy.common.demoBanner}
    </div>
  )
}
