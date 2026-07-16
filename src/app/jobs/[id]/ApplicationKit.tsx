'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  buildApplicationKit,
  type ApplicationKit,
  type ApplicationKitJob,
} from '@/lib/applicationKit'
import { getActiveSearchMission, type SearchMission } from '@/lib/missions'
import { getActiveProfile, type JapanCareerProfile } from '@/lib/profile'
import { useAppLanguage } from '@/lib/useAppLanguage'
import type { AppLanguage } from '@/lib/appLanguage'

type KitCopy = {
  title: string
  description: string
  review: string
  loading: string
  motivation: string
  desiredConditions: string
  resumeFocus: string
  questions: string
  questionsDirect: string
  questionsAgency: string
  savings: string
  facts: string
  polishPrompt: string
  copy: string
  copied: string
  manageProfile: string
  noEstimate: string
}

const COPY: Record<AppLanguage, KitCopy> = {
  'zh-TW': {
    title: '直接投遞 Application Kit', description: '依目前 Profile、這次 Mission 與職缺擷取資料建立的日文草稿。不會自動送出，也不會補造經歷。', review: '送出前請逐字確認在留資格、日期、期間、住宿與所有經歷敘述。', loading: '正在讀取目前 Profile…', motivation: '志望動機（日文草稿）', desiredConditions: '本人希望欄（日文草稿）', resumeFocus: '履歷這次要強調的段落', questions: '要確認的問題（日文）', questionsDirect: '可在直接投遞前確認', questionsAgency: '仲介配對職缺：留到與負責人確認時再問', savings: '預估月存（不會寫進應徵訊息）', facts: '這份草稿只使用的事實', polishPrompt: '交給 AI 潤飾的受限 Prompt', copy: '複製', copied: '已複製', manageProfile: '管理 Profile', noEstimate: '收入或住宿費不足，暫不做月存估算。',
  },
  en: {
    title: 'Direct-application kit', description: 'Japanese drafts from the active Profile, this Mission, and extracted listing facts. Nothing is sent or invented.', review: 'Review every visa, date, duration, housing, and experience claim before submitting.', loading: 'Loading active Profile…', motivation: 'Motivation draft (Japanese)', desiredConditions: 'Preferred conditions (Japanese)', resumeFocus: 'Resume focus for this listing', questions: 'Questions to confirm (Japanese)', questionsDirect: 'Appropriate to confirm before a direct application', questionsAgency: 'Agency listing: ask after a coordinator has matched the opening', savings: 'Estimated monthly savings (not included in the application)', facts: 'Facts used by this draft only', polishPrompt: 'Constrained prompt for AI polishing', copy: 'Copy', copied: 'Copied', manageProfile: 'Manage Profile', noEstimate: 'Income or dorm cost is missing, so no savings estimate is shown.',
  },
  ja: {
    title: '直接応募 Application Kit', description: '現在の Profile、今回の Mission、求人の抽出事実から作る日本語の草案です。自動送信や事実の補完はしません。', review: '送信前に在留資格・日付・期間・住居条件・経歴の記載を必ず確認してください。', loading: '現在の Profile を読み込んでいます…', motivation: '志望動機（日本語草案）', desiredConditions: '本人希望欄（日本語草案）', resumeFocus: 'この求人で履歴書に強調する点', questions: '確認したい質問（日本語）', questionsDirect: '直接応募の前に確認できます', questionsAgency: '派遣・紹介求人：担当者との確認段階で質問します', savings: '推定月間貯金（応募文には入れません）', facts: 'この草案で使った事実のみ', polishPrompt: 'AI で整えるための制約付きプロンプト', copy: 'コピー', copied: 'コピーしました', manageProfile: 'Profile を管理', noEstimate: '収入または寮費が不明のため、貯金の推定は表示しません。',
  },
}

function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return <button type="button" onClick={copy} className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800 transition hover:bg-orange-100">{copied ? copiedLabel : label}</button>
}

function DraftField({ title, value, copy }: { title: string; value: string; copy: KitCopy }) {
  return <div className="rounded-xl border border-stone-200 bg-stone-100/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-ink">{title}</h3><CopyButton value={value} label={copy.copy} copiedLabel={copy.copied} /></div><textarea readOnly value={value} className="mt-3 min-h-36 w-full resize-y rounded-lg border border-stone-200 bg-paper p-3 text-sm leading-6 text-stone-700 focus:outline-none" /></div>
}

export function ApplicationKitPanel({ job }: { job: ApplicationKitJob }) {
  const { language } = useAppLanguage()
  const copy = COPY[language]
  const [profile, setProfile] = useState<JapanCareerProfile | null>(null)
  const [mission, setMission] = useState<SearchMission | null>(null)

  useEffect(() => {
    const refresh = () => {
      setProfile(getActiveProfile())
      setMission(getActiveSearchMission())
    }
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('jobfit-search-missions-changed', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('jobfit-search-missions-changed', refresh)
    }
  }, [])

  const kit: ApplicationKit | null = profile ? buildApplicationKit({ job, profile, mission }) : null

  return (
    <section className="mb-6 rounded-2xl border border-orange-200 bg-paper p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Human-reviewed only</p><h2 className="mt-1 text-xl font-bold">{copy.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{copy.description}</p></div><Link href="/profiles" className="w-fit shrink-0 rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100">{copy.manageProfile}</Link></div>
      {!kit ? <p className="mt-5 rounded-xl bg-stone-100 p-4 text-sm text-stone-600">{copy.loading}</p> : <div className="mt-5 space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{copy.review}</div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><DraftField title={copy.motivation} value={kit.motivationDraft} copy={copy} /><DraftField title={copy.desiredConditions} value={kit.desiredConditionsDraft} copy={copy} /></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><div className="rounded-xl border border-stone-200 bg-stone-100/60 p-4"><h3 className="font-bold">{copy.resumeFocus}</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{kit.resumeFocus.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="rounded-xl border border-stone-200 bg-stone-100/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{copy.questions}</h3><span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs text-stone-600">{kit.questionsTiming === 'after_agency_match' ? copy.questionsAgency : copy.questionsDirect}</span></div><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{kit.questions.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
        <div className="rounded-xl border border-stone-200 bg-stone-100/60 p-4"><h3 className="font-bold">{copy.savings}</h3>{kit.savings ? <div className="mt-3 text-sm text-stone-700"><p className="text-2xl font-bold text-emerald-700">¥{kit.savings.savingsJpy.toLocaleString('ja-JP')}</p><p className="mt-1">收入 ¥{kit.savings.incomeJpy.toLocaleString('ja-JP')} − 宿舍 ¥{kit.savings.costs.dormJpy.toLocaleString('ja-JP')} − 水電 ¥{kit.savings.costs.utilitiesJpy.toLocaleString('ja-JP')} − 餐費 ¥{kit.savings.costs.mealsJpy.toLocaleString('ja-JP')} − 其他 ¥{kit.savings.costs.miscJpy.toLocaleString('ja-JP')}</p>{kit.savings.assumptions.length > 0 && <p className="mt-2 text-xs text-stone-500">Assumptions: {kit.savings.assumptions.join(', ')}</p>}</div> : <p className="mt-2 text-sm text-stone-600">{copy.noEstimate}</p>}</div>
        <details className="rounded-xl border border-stone-200 bg-stone-100/40 p-4"><summary className="cursor-pointer font-bold">{copy.facts}</summary><ul className="mt-3 space-y-2 text-sm text-stone-700">{kit.facts.map((fact, index) => <li key={`${fact.source}-${fact.label}-${index}`}><span className="mr-2 rounded bg-stone-200 px-1.5 py-0.5 text-xs text-stone-600">{fact.source}</span><span className="font-semibold">{fact.label}：</span>{fact.value}</li>)}</ul></details>
        <details className="rounded-xl border border-stone-200 bg-stone-100/40 p-4"><summary className="cursor-pointer font-bold">{copy.polishPrompt}</summary><div className="mt-3"><CopyButton value={kit.polishPrompt} label={copy.copy} copiedLabel={copy.copied} /><textarea readOnly value={kit.polishPrompt} className="mt-3 min-h-56 w-full resize-y rounded-lg border border-stone-200 bg-paper p-3 text-xs leading-5 text-stone-700 focus:outline-none" /></div></details>
      </div>}
    </section>
  )
}
