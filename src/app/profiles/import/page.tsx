'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import {
  JAPAN_CAREER_PROFILE_VERSION,
  PROFILE_BUILDER_PROMPTS,
  SEARCH_MISSION_DISCOVERY_PROMPTS,
  addProfile,
  type JapanCareerProfile,
} from '@/lib/profile'
import { getMissionCopy } from '@/lib/missions'
import { getUiCopy } from '@/lib/uiCopy'
import { useAppLanguage } from '@/lib/useAppLanguage'

function nowIso(): string {
  return new Date().toISOString()
}

function genId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `profile_${crypto.randomUUID()}`
  }
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

type ValidationResult = { ok: true } | { ok: false; error: string }

/**
 * Validate the basic shape required before importing an externally generated
 * profile. Mirrors the validation used by the profiles editor so behavior is
 * consistent across the app.
 */
function validateProfileShape(value: unknown): ValidationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'JSON 必須是一個物件 (object)。' }
  }
  const p = value as Record<string, unknown>

  if (p.version !== JAPAN_CAREER_PROFILE_VERSION) {
    return {
      ok: false,
      error: `version 必須是 "${JAPAN_CAREER_PROFILE_VERSION}"。`,
    }
  }
  if (typeof p.name !== 'string' || p.name.trim() === '') {
    return { ok: false, error: 'name 必須是非空字串。' }
  }

  const requiredObjects = [
    'target',
    'conditions',
    'languages',
    'preferences',
    'career',
  ]
  for (const key of requiredObjects) {
    if (!p[key] || typeof p[key] !== 'object' || Array.isArray(p[key])) {
      return { ok: false, error: `${key} 必須存在且為物件。` }
    }
  }

  if (!isStringArray(p.strengths)) {
    return { ok: false, error: 'strengths 必須是字串陣列。' }
  }
  if (!isStringArray(p.transferableSkills)) {
    return { ok: false, error: 'transferableSkills 必須是字串陣列。' }
  }

  return { ok: true }
}

type Status = { type: 'success' | 'error'; text: string } | null
type PromptMode = 'explore' | 'quick'

export default function ImportProfilePage() {
  const { language } = useAppLanguage()
  const copy = getUiCopy(language)
  const i = copy.profileImport
  const missionCopy = getMissionCopy(language)

  const [copyStatus, setCopyStatus] = useState<Status>(null)
  const [importStatus, setImportStatus] = useState<Status>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [jsonText, setJsonText] = useState('')
  const [importedName, setImportedName] = useState<string | null>(null)
  const [mode, setMode] = useState<PromptMode>('explore')

  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const isExploreMode = mode === 'explore'
  const selectedPrompt = isExploreMode
    ? SEARCH_MISSION_DISCOVERY_PROMPTS[language]
    : PROFILE_BUILDER_PROMPTS[language]
  const steps = isExploreMode ? missionCopy.discoverySteps : i.steps
  const promptTitle = isExploreMode
    ? missionCopy.discoveryPromptTitle
    : i.copyPromptTitle
  const promptDescription = isExploreMode
    ? missionCopy.discoveryPromptDescription
    : i.copyPromptDesc

  async function handleCopyPrompt() {
    setCopyStatus(null)

    const canUseClipboard =
      typeof navigator !== 'undefined' &&
      !!navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'

    if (canUseClipboard) {
      try {
        await navigator.clipboard.writeText(selectedPrompt)
        setCopyStatus({ type: 'success', text: '已複製提示詞到剪貼簿。' })
        return
      } catch {
        // Fall through to manual-selection fallback below.
      }
    }

    // Fallback: select the textarea contents so the user can copy manually.
    const el = promptRef.current
    if (el) {
      el.focus()
      el.select()
    }
    setCopyStatus({
      type: 'error',
      text: '無法自動存取剪貼簿，已為你選取提示詞，請手動複製（Ctrl/Cmd + C）。',
    })
  }

  function handleImport() {
    setImportStatus(null)
    setImportError(null)
    setImportedName(null)

    if (jsonText.trim() === '') {
      setImportError('請先貼上 AI 產生的 JapanCareerProfile JSON。')
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      setImportError('JSON 格式錯誤，無法解析。請確認貼上的內容是純 JSON（沒有多餘的文字或 markdown）。')
      return
    }

    const result = validateProfileShape(parsed)
    if (!result.ok) {
      setImportError(result.error)
      return
    }

    // Shape is valid. Generate a fresh id + timestamps so the imported profile
    // never collides with an existing one, regardless of what the AI returned.
    const stamp = nowIso()
    const source = parsed as Record<string, unknown>
    const profile: JapanCareerProfile = {
      ...(source as unknown as JapanCareerProfile),
      id: genId(),
      version: JAPAN_CAREER_PROFILE_VERSION,
      createdAt: stamp,
      updatedAt: stamp,
    }

    try {
      // addProfile persists to localStorage and sets the new profile as active.
      addProfile(profile)
    } catch {
      setImportError('匯入時發生未預期的錯誤，現有 Profile 未被變更。')
      return
    }

    setImportedName(profile.name)
    setImportStatus({
      type: 'success',
      text: `已匯入「${profile.name}」並設為使用中的 Profile。`,
    })
  }

  return (
    <main className="min-h-screen bg-washi px-6 py-8 text-ink">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-2xl border border-stone-200 bg-paper p-6 shadow-sm">
          <Link
            href="/profiles"
            className="text-sm text-stone-500 transition hover:text-stone-700"
          >
            {copy.common.backToProfiles}
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{i.title}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-stone-500">{i.description}</p>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Profile setup mode">
            <button
              type="button"
              onClick={() => setMode('explore')}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                isExploreMode
                  ? 'border-orange-500 bg-orange-600 text-white'
                  : 'border-stone-300 bg-paper text-stone-600 hover:bg-stone-100'
              }`}
            >
              {missionCopy.discoveryModeLabel}
            </button>
            <button
              type="button"
              onClick={() => setMode('quick')}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                !isExploreMode
                  ? 'border-orange-500 bg-orange-600 text-white'
                  : 'border-stone-300 bg-paper text-stone-600 hover:bg-stone-100'
              }`}
            >
              {i.quickModeLabel}
            </button>
          </div>

          {isExploreMode && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              {missionCopy.discoveryDescription}
            </p>
          )}
        </header>

        <section className="mb-6 rounded-2xl border border-stone-200 bg-paper p-6 shadow-sm">
          <h2 className="text-lg font-bold">{i.stepsTitle}</h2>
          <ol className="mt-3 space-y-2">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3 text-sm leading-6 text-stone-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-stone-100 text-xs font-semibold text-stone-700">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-6 rounded-2xl border border-stone-200 bg-paper p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{promptTitle}</h2>
              <p className="mt-1 text-sm text-stone-500">{promptDescription}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              {i.copyPromptButton}
            </button>
          </div>

          <p className="mt-4 text-sm text-stone-400">{isExploreMode ? missionCopy.discoveryNextStep : i.promptFollowsAppLanguage}</p>

          {copyStatus && (
            <div
              className={`mt-3 rounded-xl border p-3 text-sm ${
                copyStatus.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-amber-300 bg-amber-50 text-amber-900'
              }`}
            >
              {copyStatus.text}
            </div>
          )}

          <textarea
            ref={promptRef}
            value={selectedPrompt}
            readOnly
            spellCheck={false}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-4 h-64 w-full resize-none rounded-xl border border-stone-300 bg-washi p-4 font-mono text-xs leading-5 text-ink focus:border-orange-500 focus:outline-none"
          />
        </section>

        {isExploreMode ? (
          <section className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/60 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink">{i.exploreNextStep}</h2>
            <button
              type="button"
              onClick={() => setMode('quick')}
              className="mt-4 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              {i.switchToQuickMode}
            </button>
          </section>
        ) : (
        <section className="mb-6 rounded-2xl border border-stone-200 bg-paper p-6 shadow-sm">
          <h2 className="text-lg font-bold">{i.pasteJsonTitle}</h2>
          <p className="mt-1 text-sm text-stone-500">{i.pasteJsonDesc}</p>

          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value)
              setImportError(null)
            }}
            spellCheck={false}
            placeholder='{ "version": "japan_career_profile_v1", "name": "...", ... }'
            className="mt-4 h-64 w-full resize-none rounded-xl border border-stone-300 bg-washi p-4 font-mono text-xs leading-5 text-ink placeholder:text-stone-400 focus:border-orange-500 focus:outline-none"
          />

          {importError && (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-bold">無法匯入</p>
              <p className="mt-1">{importError}</p>
            </div>
          )}

          {importStatus?.type === 'success' && (
            <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-bold">{i.importSuccessTitle}</p>
              <p className="mt-1">{importStatus.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/profiles"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  {i.goToProfiles}
                </Link>
                {importedName && (
                  <button
                    type="button"
                    onClick={() => {
                      setJsonText('')
                      setImportStatus(null)
                      setImportedName(null)
                    }}
                    className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
                  >
                    {i.importAnother}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              {i.importButton}
            </button>
            <Link
              href="/profiles"
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              {i.backToProfiles}
            </Link>
          </div>
        </section>
        )}
      </div>
    </main>
  )
}
