'use client'

import { APP_LANGUAGE_OPTIONS, isAppLanguage } from '@/lib/appLanguage'
import { getUiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'

export function AppLanguageSelector() {
  const { language, setLanguage } = useAppLanguage()
  const copy = getUiCopy(language)

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value
    if (isAppLanguage(next)) {
      setLanguage(next)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="app-language"
        className="shrink-0 text-xs text-stone-500"
      >
        {copy.common.language}
      </label>
      <select
        id="app-language"
        value={language}
        onChange={handleChange}
        aria-label="App language"
        className="max-w-[9.5rem] rounded-lg border border-stone-300 bg-stone-100 px-2 py-1 text-xs text-ink outline-none transition hover:border-stone-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 sm:max-w-none sm:text-sm"
      >
        {APP_LANGUAGE_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
