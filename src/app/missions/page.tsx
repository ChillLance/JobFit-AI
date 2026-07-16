'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { getActiveProfile } from '@/lib/profile'
import {
  createBlankSearchMission,
  createSearchMissionFromJson,
  deleteSearchMission,
  getMissionCopy,
  getSearchMissionStore,
  saveSearchMission,
  setActiveSearchMission,
  type MissionPriority,
  type SearchMission,
  type SearchMissionStore,
} from '@/lib/missions'
import { useAppLanguage } from '@/lib/useAppLanguage'

const FIELD_CLASS = 'w-full rounded-xl border border-stone-300 bg-washi px-3 py-2 text-sm text-ink focus:border-orange-500 focus:outline-none'

function splitList(value: string): string[] {
  return value.split(/[,\n、]/).map((item) => item.trim()).filter(Boolean)
}

function joinList(value: string[]): string {
  return value.join(', ')
}

function parseNullableNumber(value: string): number | null {
  const parsed = Number(value)
  return value.trim() === '' || !Number.isFinite(parsed) ? null : Math.max(0, parsed)
}

function tradeoffsToText(mission: SearchMission): string {
  return mission.tradeoffs.map((tradeoff) => `${tradeoff.condition} | ${tradeoff.acceptableWhen}`).join('\n')
}

function textToTradeoffs(value: string) {
  return value
    .split('\n')
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts[0] && parts[1])
    .map(([condition, acceptableWhen]) => ({ condition, acceptableWhen }))
}

export default function MissionsPage() {
  const { language } = useAppLanguage()
  const copy = getMissionCopy(language)
  const [store, setStore] = useState<SearchMissionStore | null>(null)
  const [editing, setEditing] = useState<SearchMission | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jsonText, setJsonText] = useState('')
  const [showJsonImport, setShowJsonImport] = useState(false)

  function refresh(next = getSearchMissionStore()) {
    setStore(next)
  }

  useEffect(() => {
    // localStorage is intentionally read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [])

  function createMission() {
    setEditing(createBlankSearchMission(getActiveProfile().id))
    setError(null)
  }

  function importJson() {
    setError(null)
    try {
      const mission = createSearchMissionFromJson(JSON.parse(jsonText), getActiveProfile().id)
      if (!mission) {
        setError(copy.importJsonInvalid)
        return
      }
      setEditing(mission)
      setJsonText('')
      setShowJsonImport(false)
    } catch {
      setError(copy.importJsonInvalid)
    }
  }

  function save() {
    if (!editing) return
    if (!editing.name.trim()) {
      setError(language === 'zh-TW' ? '請先替這次搜尋命名。' : language === 'ja' ? '今回の目的に名前を付けてください。' : 'Name this search mission first.')
      return
    }
    refresh(saveSearchMission(editing))
    setEditing(null)
    setError(null)
  }

  function remove(mission: SearchMission) {
    if (!window.confirm(`${copy.delete} “${mission.name}”?`)) return
    refresh(deleteSearchMission(mission.id))
    if (editing?.id === mission.id) setEditing(null)
  }

  if (!store) return <main className="min-h-screen bg-washi px-6 py-8 text-ink" />

  return (
    <main className="min-h-screen bg-washi px-6 py-8 text-ink">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-2xl border border-stone-200 bg-paper p-6 shadow-sm">
          <Link href="/" className="text-sm text-stone-500 transition hover:text-stone-700">{copy.backToDashboard}</Link>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div><h1 className="text-3xl font-bold">{copy.title}</h1><p className="mt-2 max-w-2xl leading-6 text-stone-500">{copy.description}</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowJsonImport((value) => !value)} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100">{copy.importJson}</button><button type="button" onClick={createMission} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500">{copy.create}</button></div>
          </div>
        </header>

        {showJsonImport && <section className="mb-6 rounded-2xl border border-stone-200 bg-paper p-6 shadow-sm"><label className="block text-sm font-semibold text-stone-700">{copy.importJson}<span className="mt-1 block text-xs font-normal text-stone-500">{copy.importJsonHint}</span><textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} className={`${FIELD_CLASS} mt-2 min-h-40 font-mono`} /></label>{error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowJsonImport(false)} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">{copy.cancel}</button><button type="button" onClick={importJson} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">{copy.importJson}</button></div></section>}

        {editing && <MissionEditor mission={editing} copy={copy} onChange={setEditing} onSave={save} onCancel={() => { setEditing(null); setError(null) }} error={error} />}

        {store.missions.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-stone-300 bg-paper p-10 text-center">
            <h2 className="text-xl font-bold">{copy.emptyTitle}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-500">{copy.emptyDescription}</p>
            <button type="button" onClick={createMission} className="mt-5 rounded-xl border border-orange-600 bg-orange-600/10 px-4 py-2.5 text-sm font-semibold text-orange-800 transition hover:bg-orange-600/20">{copy.setup}</button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {store.missions.map((mission) => {
              const active = mission.id === store.activeMissionId
              return (
                <article key={mission.id} className={`rounded-2xl border bg-paper p-5 shadow-sm ${active ? 'border-emerald-300 ring-1 ring-emerald-700/30' : 'border-stone-200'}`}>
                  <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{mission.name}</h2>{mission.description && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{mission.description}</p>}</div>{active && <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{copy.active}</span>}</div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">{mission.goalPriorities.slice(0, 2).map((priority) => <span key={priority} className="rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-800">{copy.priority[priority]}</span>)}{mission.targetRegions.slice(0, 2).map((region) => <span key={region} className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">{region}</span>)}</div>
                  {mission.experienceGoals.length > 0 && <p className="mt-3 text-sm text-stone-600"><span className="font-semibold">{copy.experienceGoals}：</span>{mission.experienceGoals.join('、')}</p>}
                  {mission.tradeoffs.length > 0 && <p className="mt-2 text-sm text-stone-600"><span className="font-semibold">{copy.tradeoffs}：</span>{mission.tradeoffs[0].condition} → {mission.tradeoffs[0].acceptableWhen}</p>}
                  <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => refresh(setActiveSearchMission(mission.id))} disabled={active} className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-40">{copy.useForDecisions}</button><button type="button" onClick={() => { setEditing(mission); setError(null) }} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100">{copy.edit}</button><button type="button" onClick={() => remove(mission)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">{copy.delete}</button></div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}

function MissionEditor({ mission, copy, onChange, onSave, onCancel, error }: { mission: SearchMission; copy: ReturnType<typeof getMissionCopy>; onChange: (mission: SearchMission) => void; onSave: () => void; onCancel: () => void; error: string | null }) {
  const set = <K extends keyof SearchMission>(key: K, value: SearchMission[K]) => onChange({ ...mission, [key]: value })
  const setConstraint = <K extends keyof SearchMission['constraints']>(key: K, value: SearchMission['constraints'][K]) => onChange({ ...mission, constraints: { ...mission.constraints, [key]: value } })
  const setPriority = (index: number, value: MissionPriority) => {
    const next = [...mission.goalPriorities]
    const oldIndex = next.indexOf(value)
    if (oldIndex >= 0) [next[index], next[oldIndex]] = [next[oldIndex], next[index]]
    set('goalPriorities', next)
  }

  return (
    <section className="mb-6 rounded-2xl border border-orange-200 bg-paper p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={copy.title}><input value={mission.name} onChange={(e) => set('name', e.target.value)} className={FIELD_CLASS} /></Field><Field label={copy.descriptionLabel}><input value={mission.description} onChange={(e) => set('description', e.target.value)} className={FIELD_CLASS} /></Field>
        <Field label={copy.from}><input type="month" value={mission.availableFrom ?? ''} onChange={(e) => set('availableFrom', e.target.value || null)} className={FIELD_CLASS} /></Field><Field label={copy.until}><input type="month" value={mission.availableUntil ?? ''} onChange={(e) => set('availableUntil', e.target.value || null)} className={FIELD_CLASS} /></Field>
        <Field label={copy.targetAreas}><input value={joinList(mission.targetRegions)} onChange={(e) => set('targetRegions', splitList(e.target.value))} className={FIELD_CLASS} /></Field><Field label={copy.keywords}><input value={joinList(mission.matchKeywords)} onChange={(e) => set('matchKeywords', splitList(e.target.value))} className={FIELD_CLASS} /></Field>
        <Field label={copy.experienceGoals}><input value={joinList(mission.experienceGoals)} onChange={(e) => set('experienceGoals', splitList(e.target.value))} className={FIELD_CLASS} /></Field><Field label={copy.growthGoals}><input value={joinList(mission.growthGoals)} onChange={(e) => set('growthGoals', splitList(e.target.value))} className={FIELD_CLASS} /></Field>
        <Field label={copy.primaryPriority}><PrioritySelect value={mission.goalPriorities[0]} onChange={(value) => setPriority(0, value)} copy={copy} /></Field><Field label={copy.secondaryPriority}><PrioritySelect value={mission.goalPriorities[1]} onChange={(value) => setPriority(1, value)} copy={copy} /></Field>
      </div>
      <h3 className="mt-6 text-sm font-bold">{copy.constraints}</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label={copy.minMonthlyIncome}><input inputMode="numeric" value={mission.constraints.minimumMonthlyIncomeJpy ?? ''} onChange={(e) => setConstraint('minimumMonthlyIncomeJpy', parseNullableNumber(e.target.value))} className={FIELD_CLASS} /></Field><Field label={copy.maxDormFee}><input inputMode="numeric" value={mission.constraints.maximumDormFeeJpy ?? ''} onChange={(e) => setConstraint('maximumDormFeeJpy', parseNullableNumber(e.target.value))} className={FIELD_CLASS} /></Field><Field label={copy.maxDuration}><input inputMode="numeric" value={mission.constraints.maximumDurationMonths ?? ''} onChange={(e) => setConstraint('maximumDurationMonths', parseNullableNumber(e.target.value))} className={FIELD_CLASS} /></Field></div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-700"><Check label={copy.privateRoomRequired} checked={mission.constraints.privateRoomRequired === true} onChange={(checked) => setConstraint('privateRoomRequired', checked ? true : null)} /><Check label={copy.liveInRequired} checked={mission.constraints.liveInRequired === true} onChange={(checked) => setConstraint('liveInRequired', checked ? true : null)} /><Check label={copy.noSplitShift} checked={mission.constraints.splitShiftAccepted === false} onChange={(checked) => setConstraint('splitShiftAccepted', checked ? false : null)} /><Check label={copy.noNightWork} checked={mission.constraints.nightWorkAccepted === false} onChange={(checked) => setConstraint('nightWorkAccepted', checked ? false : null)} /></div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"><Field label={copy.tradeoffs} hint={copy.tradeoffsHint}><textarea value={tradeoffsToText(mission)} onChange={(e) => set('tradeoffs', textToTradeoffs(e.target.value))} className={`${FIELD_CLASS} min-h-28`} /></Field><Field label={copy.notes}><textarea value={mission.notes} onChange={(e) => set('notes', e.target.value)} className={`${FIELD_CLASS} min-h-28`} /></Field></div>
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">{copy.cancel}</button><button type="button" onClick={onSave} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">{copy.save}</button></div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { return <label className="block text-sm font-semibold text-stone-700"><span>{label}</span>{hint && <span className="mt-1 block text-xs font-normal text-stone-500">{hint}</span>}<span className="mt-1.5 block">{children}</span></label> }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-orange-600" />{label}</label> }
function PrioritySelect({ value, onChange, copy }: { value: MissionPriority; onChange: (value: MissionPriority) => void; copy: ReturnType<typeof getMissionCopy> }) { return <select value={value} onChange={(e) => onChange(e.target.value as MissionPriority)} className={FIELD_CLASS}><option value="experience">{copy.priority.experience}</option><option value="growth">{copy.priority.growth}</option><option value="savings">{copy.priority.savings}</option><option value="stability">{copy.priority.stability}</option></select> }
