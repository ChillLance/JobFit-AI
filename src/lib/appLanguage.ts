/**
 * Shared app UI language preference (zh-TW, en, ja).
 * Used by the language selector, profile prompts, and AI output instructions.
 */

export type AppLanguage = 'zh-TW' | 'en' | 'ja'

export const DEFAULT_APP_LANGUAGE: AppLanguage = 'zh-TW'

export const APP_LANGUAGE_STORAGE_KEY = 'jobfit_ai_app_language'

export const APP_LANGUAGE_LABELS: Record<AppLanguage, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
}

export const APP_LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = (
  Object.entries(APP_LANGUAGE_LABELS) as [AppLanguage, string][]
).map(([value, label]) => ({ value, label }))

const APP_LANGUAGES: readonly AppLanguage[] = ['zh-TW', 'en', 'ja']

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === 'string' &&
    (APP_LANGUAGES as readonly string[]).includes(value)
  )
}

const AI_OUTPUT_LANGUAGE_INSTRUCTIONS: Record<AppLanguage, string> = {
  'zh-TW': '請使用繁體中文回覆分析結果。請避免簡體中文。',
  en: 'Please write the analysis result in English.',
  ja: '分析結果は日本語で書いてください。',
}

export function getAiOutputLanguageInstruction(language: AppLanguage): string {
  return AI_OUTPUT_LANGUAGE_INSTRUCTIONS[language]
}
