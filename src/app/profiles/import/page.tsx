'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import {
  JAPAN_CAREER_PROFILE_VERSION,
  PROFILE_BUILDER_PROMPT_ZH,
  addProfile,
  type JapanCareerProfile,
} from '@/lib/profile'

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

const STEPS = [
  '複製下方的提示詞 (Prompt)。',
  '貼到你的 AI 助手（ChatGPT / Gemini / Claude）。',
  '在該 AI 工具中上傳或貼上你的履歷 / 職務經歷書 / 作品集等資料。',
  '複製 AI 產生的 JapanCareerProfile JSON。',
  '貼到下方欄位並點「Import Profile」匯入。',
]

export default function ImportProfilePage() {
  const [copyStatus, setCopyStatus] = useState<Status>(null)
  const [importStatus, setImportStatus] = useState<Status>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [jsonText, setJsonText] = useState('')
  const [importedName, setImportedName] = useState<string | null>(null)

  const promptRef = useRef<HTMLTextAreaElement | null>(null)

  async function handleCopyPrompt() {
    setCopyStatus(null)

    const canUseClipboard =
      typeof navigator !== 'undefined' &&
      !!navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'

    if (canUseClipboard) {
      try {
        await navigator.clipboard.writeText(PROFILE_BUILDER_PROMPT_ZH)
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
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <Link
            href="/profiles"
            className="text-sm text-slate-400 transition hover:text-slate-200"
          >
            ← 回 Profiles
          </Link>
          <h1 className="mt-2 text-3xl font-bold">
            Import Profile from External AI
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-400">
            JobFit-AI 不需要你的原始履歷。你可以在自己信任的 AI 工具中處理敏感的個人文件，
            只把整理後、結構化的 Profile JSON 貼回來匯入。你的履歷原文不會經過 JobFit-AI。
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <h2 className="text-lg font-bold">操作步驟</h2>
          <ol className="mt-3 space-y-2">
            {STEPS.map((step, index) => (
              <li key={index} className="flex gap-3 text-sm leading-6 text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">1. 複製提示詞</h2>
              <p className="mt-1 text-sm text-slate-400">
                貼到 ChatGPT / Gemini / Claude，並附上你的求職資料。
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Copy Prompt
            </button>
          </div>

          {copyStatus && (
            <div
              className={`mt-3 rounded-xl border p-3 text-sm ${
                copyStatus.type === 'success'
                  ? 'border-emerald-700 bg-emerald-950/40 text-emerald-100'
                  : 'border-amber-700 bg-amber-950/40 text-amber-100'
              }`}
            >
              {copyStatus.text}
            </div>
          )}

          <textarea
            ref={promptRef}
            value={PROFILE_BUILDER_PROMPT_ZH}
            readOnly
            spellCheck={false}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-4 h-64 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 focus:border-blue-500 focus:outline-none"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <h2 className="text-lg font-bold">2. 貼上並匯入 JSON</h2>
          <p className="mt-1 text-sm text-slate-400">
            把 AI 產生的 JapanCareerProfile JSON 貼到下方，然後點「Import Profile」。
          </p>

          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value)
              setImportError(null)
            }}
            spellCheck={false}
            placeholder='{ "version": "japan_career_profile_v1", "name": "...", ... }'
            className="mt-4 h-64 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />

          {importError && (
            <div className="mt-3 rounded-xl border border-red-700 bg-red-950/50 p-3 text-sm text-red-100">
              <p className="font-bold">無法匯入</p>
              <p className="mt-1">{importError}</p>
            </div>
          )}

          {importStatus?.type === 'success' && (
            <div className="mt-3 rounded-xl border border-emerald-700 bg-emerald-950/40 p-4 text-sm text-emerald-100">
              <p className="font-bold">匯入成功</p>
              <p className="mt-1">{importStatus.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/profiles"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  前往 Profiles 查看
                </Link>
                {importedName && (
                  <button
                    type="button"
                    onClick={() => {
                      setJsonText('')
                      setImportStatus(null)
                      setImportedName(null)
                    }}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                  >
                    再匯入一個
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Import Profile
            </button>
            <Link
              href="/profiles"
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              返回 Profiles
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
