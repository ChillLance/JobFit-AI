'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  APP_LANGUAGE_LABELS,
  APP_LANGUAGE_OPTIONS,
  APP_LANGUAGE_STORAGE_KEY,
  DEFAULT_APP_LANGUAGE,
  isAppLanguage,
  type AppLanguage,
} from './appLanguage'

function canUseLocalStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  )
}

export function useAppLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>(
    DEFAULT_APP_LANGUAGE,
  )

  useEffect(() => {
    if (!canUseLocalStorage()) return
    const stored = window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)
    if (isAppLanguage(stored)) {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next)
    if (canUseLocalStorage()) {
      window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, next)
    }
  }, [])

  const languageLabel = APP_LANGUAGE_LABELS[language]

  return {
    language,
    setLanguage,
    languageLabel,
    options: APP_LANGUAGE_OPTIONS,
  }
}
