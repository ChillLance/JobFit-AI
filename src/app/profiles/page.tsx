'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  JAPAN_CAREER_PROFILE_VERSION,
  addProfile,
  deleteProfile,
  getProfileStore,
  resetProfileStore,
  setActiveProfile,
  updateProfile,
  type JapanCareerProfile,
  type ProfileStore,
} from '@/lib/profile'
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

function formatDate(value?: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

/** Build a valid, empty JapanCareerProfile with sensible defaults. */
function createBlankProfile(): JapanCareerProfile {
  const stamp = nowIso()
  return {
    id: genId(),
    version: JAPAN_CAREER_PROFILE_VERSION,
    name: 'New Career Profile',
    description: '',
    createdAt: stamp,
    updatedAt: stamp,
    target: {
      desiredRoles: [],
      desiredLocations: [],
      industries: [],
      preferredKeywords: [],
    },
    conditions: {
      acceptableEmploymentTypes: [],
      minimumMonthlySalary: null,
      minimumAnnualSalary: null,
      overtimeTolerance: 'flexible',
      shiftWorkTolerance: 'flexible',
      nightShiftTolerance: 'flexible',
      transferTolerance: 'flexible',
      remotePreference: 'no_preference',
    },
    visa: {
      currentStatus: '',
      needsVisaSupport: false,
      notes: '',
    },
    languages: {
      japaneseLevel: '',
      englishLevel: '',
      otherLanguages: [],
    },
    preferences: {
      values: [],
      dealBreakers: [],
      risksToAvoid: [],
    },
    strengths: [],
    transferableSkills: [],
    career: {
      currentDirection: '',
      careerGoal: '',
      futureVision: '',
      openToCareerChange: false,
    },
    notes: '',
  }
}

/** Clone an existing profile with a fresh id, "Copy" suffix and new timestamps. */
function duplicateProfileFrom(source: JapanCareerProfile): JapanCareerProfile {
  const stamp = nowIso()
  const clone = JSON.parse(JSON.stringify(source)) as JapanCareerProfile
  return {
    ...clone,
    id: genId(),
    version: JAPAN_CAREER_PROFILE_VERSION,
    name: `${source.name} Copy`,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

type ValidationResult = { ok: true } | { ok: false; error: string }

/**
 * Validate the basic shape required before saving an edited profile.
 * This intentionally only checks the fields the task requires; it does not
 * enforce every nested field so users can still edit freely.
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

  const requiredObjects = ['target', 'conditions', 'languages', 'preferences', 'career']
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

type Toast = { type: 'success' | 'error'; text: string } | null

type EditorState = {
  profileId: string
  profileName: string
  text: string
  error: string | null
} | null

const TONE_BUTTON =
  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

export default function ProfilesPage() {
  const { language } = useAppLanguage()
  const copy = getUiCopy(language)
  const p = copy.profiles

  const [store, setStore] = useState<ProfileStore | null>(null)
  const [toast, setToast] = useState<Toast>(null)
  const [editor, setEditor] = useState<EditorState>(null)

  // profileStore relies on localStorage, so we only read it on the client
  // after mount to avoid any SSR/hydration mismatch. setState here is intentional.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStore(getProfileStore())
  }, [])

  function showToast(next: Exclude<Toast, null>) {
    setToast(next)
  }

  function refresh(next: ProfileStore) {
    setStore(next)
  }

  function handleSetActive(id: string) {
    refresh(setActiveProfile(id))
    showToast({ type: 'success', text: '已切換使用中的 Profile。' })
  }

  function handleCreateBlank() {
    const profile = createBlankProfile()
    refresh(addProfile(profile))
    showToast({ type: 'success', text: '已建立空白 Profile，並設為使用中。' })
  }

  function handleDuplicateActive() {
    if (!store) return
    const active = store.profiles.find((p) => p.id === store.activeProfileId)
    if (!active) {
      showToast({ type: 'error', text: '找不到使用中的 Profile 可複製。' })
      return
    }
    refresh(addProfile(duplicateProfileFrom(active)))
    showToast({ type: 'success', text: '已複製使用中的 Profile。' })
  }

  function handleDuplicateOne(profile: JapanCareerProfile) {
    refresh(addProfile(duplicateProfileFrom(profile)))
    showToast({ type: 'success', text: `已複製「${profile.name}」。` })
  }

  function handleDelete(profile: JapanCareerProfile) {
    if (!store) return

    if (store.profiles.length <= 1) {
      showToast({ type: 'error', text: '無法刪除：至少要保留一個 Profile。' })
      return
    }

    const confirmed = window.confirm(
      `確定要刪除「${profile.name}」嗎？此操作無法復原。`
    )
    if (!confirmed) return

    const next = deleteProfile(profile.id)

    // The store layer protects the default profile and the last remaining
    // profile, so verify the delete actually took effect.
    const stillExists = next.profiles.some((p) => p.id === profile.id)
    if (stillExists) {
      refresh(next)
      showToast({
        type: 'error',
        text: '此 Profile 無法被刪除（可能是預設 Profile）。',
      })
      return
    }

    refresh(next)
    showToast({ type: 'success', text: `已刪除「${profile.name}」。` })
  }

  function handleReset() {
    const confirmed = window.confirm(
      '確定要重設為預設 Profile 嗎？目前所有自訂 Profile 將被移除，此操作無法復原。'
    )
    if (!confirmed) return
    refresh(resetProfileStore())
    showToast({ type: 'success', text: '已重設為預設 Profile。' })
  }

  function openEditor(profile: JapanCareerProfile) {
    setEditor({
      profileId: profile.id,
      profileName: profile.name,
      text: JSON.stringify(profile, null, 2),
      error: null,
    })
  }

  function handleEditorSave() {
    if (!editor) return

    let parsed: unknown
    try {
      parsed = JSON.parse(editor.text)
    } catch {
      setEditor({ ...editor, error: 'JSON 格式錯誤，無法解析。請檢查語法。' })
      return
    }

    const result = validateProfileShape(parsed)
    if (!result.ok) {
      setEditor({ ...editor, error: result.error })
      return
    }

    // updateProfile preserves the original id, version and createdAt, and
    // stamps a fresh updatedAt for us.
    const next = updateProfile(
      editor.profileId,
      parsed as Partial<JapanCareerProfile>
    )
    refresh(next)
    setEditor(null)
    showToast({ type: 'success', text: 'Profile 已更新並儲存。' })
  }

  async function handleExport(profile: JapanCareerProfile) {
    const json = JSON.stringify(profile, null, 2)

    const canUseClipboard =
      typeof navigator !== 'undefined' &&
      !!navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'

    if (canUseClipboard) {
      try {
        await navigator.clipboard.writeText(json)
        showToast({ type: 'success', text: `已複製「${profile.name}」JSON 到剪貼簿。` })
        return
      } catch {
        // Fall through to the textarea fallback below.
      }
    }

    // Fallback: surface the JSON in the editor textarea so the user can copy
    // it manually.
    setEditor({
      profileId: profile.id,
      profileName: profile.name,
      text: json,
      error: null,
    })
    showToast({
      type: 'error',
      text: '無法存取剪貼簿，已在編輯器中顯示 JSON，請手動複製。',
    })
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-slate-400">{p.loading}</p>
        </div>
      </main>
    )
  }

  const activeProfile =
    store.profiles.find((p) => p.id === store.activeProfileId) ??
    store.profiles[0]

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <Link
                href="/"
                className="text-sm text-slate-400 transition hover:text-slate-200"
              >
                {copy.common.backToDashboard}
              </Link>
              <h1 className="mt-2 text-3xl font-bold">{p.title}</h1>
              <p className="mt-2 max-w-2xl text-slate-400">{p.description}</p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              {p.activeProfileLabel}
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-100">
              {activeProfile?.name ?? '—'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreateBlank}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              {p.createBlank}
            </button>
            <button
              type="button"
              onClick={handleDuplicateActive}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-700"
            >
              {p.duplicateActive}
            </button>
            <Link
              href="/profiles/import"
              className="rounded-xl border border-violet-600 bg-violet-600/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-600/20"
            >
              {p.importFromAi}
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto rounded-xl border border-red-500/60 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              {p.resetDefault}
            </button>
          </div>
        </header>

        {toast && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${
              toast.type === 'success'
                ? 'border-emerald-700 bg-emerald-950/40 text-emerald-100'
                : 'border-red-700 bg-red-950/50 text-red-100'
            }`}
          >
            {toast.text}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {store.profiles.map((profile) => {
            const isActive = profile.id === store.activeProfileId
            const careerSummary =
              profile.career.careerGoal?.trim() ||
              profile.career.futureVision?.trim() ||
              '—'

            return (
              <article
                key={profile.id}
                className={`flex h-full flex-col rounded-2xl border bg-slate-900 p-5 shadow-lg transition ${
                  isActive
                    ? 'border-emerald-700 ring-1 ring-emerald-800/60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold leading-snug">
                    {profile.name || p.unnamedProfile}
                  </h2>
                  {isActive && (
                    <span className="shrink-0 rounded-full border border-emerald-700 bg-emerald-950/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      {copy.common.active}
                    </span>
                  )}
                </div>

                {profile.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
                    {profile.description}
                  </p>
                )}

                <dl className="mt-4 space-y-2 text-sm">
                  <ProfileField
                    label={p.fields.desiredRoles}
                    value={profile.target.desiredRoles}
                  />
                  <ProfileField
                    label={p.fields.desiredLocations}
                    value={profile.target.desiredLocations}
                  />
                  <ProfileField
                    label={p.fields.japaneseLevel}
                    value={profile.languages.japaneseLevel || '—'}
                  />
                  <ProfileField
                    label={p.fields.employmentTypes}
                    value={profile.conditions.acceptableEmploymentTypes}
                  />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {p.fields.careerGoal}
                    </dt>
                    <dd className="mt-0.5 line-clamp-3 text-slate-300">
                      {careerSummary}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs text-slate-500">
                  {p.lastUpdated}{formatDate(profile.updatedAt)}
                </p>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => handleSetActive(profile.id)}
                    disabled={isActive}
                    className={`${TONE_BUTTON} border-emerald-600 text-emerald-300 hover:bg-emerald-500/10`}
                  >
                    {isActive ? p.inUse : p.setActive}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateOne(profile)}
                    className={`${TONE_BUTTON} border-slate-600 text-slate-200 hover:bg-slate-800`}
                  >
                    {p.duplicate}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditor(profile)}
                    className={`${TONE_BUTTON} border-slate-600 text-slate-200 hover:bg-slate-800`}
                  >
                    {p.editJson}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport(profile)}
                    className={`${TONE_BUTTON} border-slate-600 text-slate-200 hover:bg-slate-800`}
                  >
                    {p.exportJson}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(profile)}
                    className={`${TONE_BUTTON} border-red-500/60 text-red-300 hover:bg-red-500/10`}
                  >
                    {p.delete}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold">{p.editModalTitle}</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {editor.profileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                {copy.common.close}
              </button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              <textarea
                value={editor.text}
                onChange={(e) =>
                  setEditor({ ...editor, text: e.target.value, error: null })
                }
                spellCheck={false}
                className="h-[55vh] w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 focus:border-blue-500 focus:outline-none"
              />

              {editor.error && (
                <div className="mt-3 rounded-xl border border-red-700 bg-red-950/50 p-3 text-sm text-red-100">
                  <p className="font-bold">無法儲存</p>
                  <p className="mt-1">{editor.error}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                {copy.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleEditorSave}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                {copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ProfileField({
  label,
  value,
}: {
  label: string
  value: string | string[]
}) {
  const display = Array.isArray(value)
    ? value.length > 0
      ? value.join('、')
      : '—'
    : value

  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 line-clamp-2 text-slate-300">{display}</dd>
    </div>
  )
}
