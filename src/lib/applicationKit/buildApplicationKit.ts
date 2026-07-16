import { inferApplicationRoute } from '@/lib/missions'
import { estimateMonthlySavings } from '@/lib/jobs/savings'
import type {
  ApplicationKit,
  ApplicationKitFact,
  ApplicationKitInput,
} from './types'

function clean(values: string[] | undefined, limit = 4): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean).slice(0, limit)
}

function addFact(facts: ApplicationKitFact[], source: ApplicationKitFact['source'], label: string, value: string | null | undefined) {
  const cleaned = value?.trim()
  if (cleaned) facts.push({ source, label, value: cleaned })
}

function formatYen(value: number | null): string | null {
  return typeof value === 'number' ? `¥${value.toLocaleString('ja-JP')}` : null
}

function buildQuestions(input: ApplicationKitInput): Pick<ApplicationKit, 'questions' | 'questionsTiming'> {
  const extraction = input.job.extraction
  const route = inferApplicationRoute(input.job)
  const questions: string[] = []

  if (!extraction) {
    questions.push('勤務開始日・契約期間・給与・住居条件について、募集内容の詳細を確認させてください。')
  } else {
    if (extraction.startTiming === null || extraction.minDurationMonths === null) {
      questions.push('勤務開始可能日と、最低契約期間・延長の可能性を教えていただけますか。')
    }
    if (extraction.statedMonthlyIncomeJpy === null && extraction.wageMinJpy === null) {
      questions.push('時給・月収の目安と、残業・深夜勤務時の給与条件を教えていただけますか。')
    }
    if (extraction.housingType === null || extraction.dormFeeJpy === null) {
      questions.push('寮の部屋タイプ、寮費、水光熱費、入寮条件を確認させてください。')
    }
    if (extraction.mealsCostType === null) {
      questions.push('食事提供の有無と、自己負担がある場合の金額を教えていただけますか。')
    }
    if (extraction.shiftType === null || extraction.nightWork === null) {
      questions.push('シフトの時間帯、中抜け・夜勤の有無、月の休日目安を教えていただけますか。')
    }
  }

  if (questions.length === 0) {
    questions.push('応募後の選考手順と、勤務開始までに必要な準備を教えていただけますか。')
  }

  return {
    questions: questions.slice(0, 4),
    questionsTiming: route === 'agency' ? 'after_agency_match' : 'before_direct_application',
  }
}

/**
 * Produces a copy-ready, Japanese application kit from only structured listing
 * data and the active Profile/Mission. It intentionally never invents an
 * employer need, achievement, visa fact, or availability date.
 */
export function buildApplicationKit(input: ApplicationKitInput): ApplicationKit {
  const { job, profile, mission } = input
  const extraction = job.extraction
  const facts: ApplicationKitFact[] = []
  const strengths = clean(profile.strengths, 3)
  const skills = clean(profile.transferableSkills, 3)
  const experienceGoal = mission ? clean(mission.experienceGoals, 1)[0] : undefined
  const growthGoal = mission ? clean(mission.growthGoals, 1)[0] : undefined
  const workplace = extraction?.workplaceName || job.company || job.title || '貴社'
  const role = extraction?.dutySummary || job.title || '募集内容'

  addFact(facts, 'listing', '募集先', workplace)
  addFact(facts, 'listing', '業務内容', extraction?.dutySummary || job.title)
  addFact(facts, 'listing', '勤務地', extraction?.areaName || extraction?.prefecture || job.location)
  addFact(facts, 'listing', '雇用形態', extraction?.employmentType || job.employmentType)
  addFact(facts, 'listing', '月収記載', formatYen(extraction?.statedMonthlyIncomeJpy ?? null))
  addFact(facts, 'listing', '寮費記載', formatYen(extraction?.dormFeeJpy ?? null))

  addFact(facts, 'profile', '日本語', profile.languages.japaneseLevel)
  addFact(facts, 'profile', '英語', profile.languages.englishLevel)
  addFact(facts, 'profile', '在留資格', profile.visa.currentStatus)
  if (strengths.length > 0) addFact(facts, 'profile', '強み', strengths.join(' / '))
  if (skills.length > 0) addFact(facts, 'profile', '活かせるスキル', skills.join(' / '))

  if (mission) {
    addFact(facts, 'mission', '今回の目的', mission.description)
    if (experienceGoal) addFact(facts, 'mission', '得たい体験', experienceGoal)
    if (growthGoal) addFact(facts, 'mission', '得たい成長', growthGoal)
    if (mission.targetRegions.length > 0) addFact(facts, 'mission', '希望エリア', clean(mission.targetRegions, 3).join(' / '))
  }

  const strengthSentence = strengths.length > 0
    ? `私の強みである${strengths.join('、')}を活かし`
    : '自分の経験・強みを確認したうえで'
  const languageSentence = [profile.languages.japaneseLevel, profile.languages.englishLevel]
    .filter(Boolean)
    .join('、')
  const growthSentence = growthGoal ? `また、${growthGoal}につながる環境で、` : ''

  const motivationDraft = [
    `${workplace}の${role}の募集を拝見し、業務内容に魅力を感じ、応募を希望いたしました。`,
    languageSentence
      ? `${languageSentence}をプロフィール上の事実として確認しています。${strengthSentence}、担当業務に誠実に取り組みたいと考えております。`
      : `${strengthSentence}、担当業務に誠実に取り組みたいと考えております。`,
    `${growthSentence}募集内容に記載された条件を確認しながら、早く仕事を覚え、チームに貢献できるよう努めます。`,
  ].join('\n')

  const desiredLines: string[] = []
  if (profile.visa.currentStatus.trim()) desiredLines.push(`在留資格：${profile.visa.currentStatus.trim()}`)
  if (profile.workingHoliday?.availableFrom) desiredLines.push(`勤務開始可能日：${profile.workingHoliday.availableFrom}`)
  if (profile.workingHoliday?.availableUntil) desiredLines.push(`勤務可能期間：${profile.workingHoliday.availableFrom ?? '要確認'} ～ ${profile.workingHoliday.availableUntil}`)
  else if (profile.workingHoliday?.availableMonths) desiredLines.push(`勤務可能期間：最大${profile.workingHoliday.availableMonths}か月`)
  if (mission?.availableFrom || mission?.availableUntil) desiredLines.push(`今回の希望期間：${mission.availableFrom ?? '要確認'} ～ ${mission.availableUntil ?? '要確認'}`)
  if (mission?.targetRegions.length) desiredLines.push(`希望エリア：${clean(mission.targetRegions, 3).join('、')}`)
  if (mission?.constraints.privateRoomRequired === true) desiredLines.push('住居条件：個室を希望しております。')
  if (mission?.constraints.liveInRequired === true) desiredLines.push('住居条件：住み込みを希望しております。')
  if (desiredLines.length === 0) desiredLines.push('勤務開始日・勤務期間・在留資格は、応募前に確認のうえ記載します。')
  const desiredConditionsDraft = desiredLines.join('\n')

  const resumeFocus = [
    strengths.length > 0 ? `履歴書では「${strengths.join('／')}」に絞って、求人業務とつながる順に見せる。` : '履歴書では、この求人に関係する実績・強みだけを選び、確認できない経験は追加しない。',
    languageSentence ? `言語欄は「${languageSentence}」を Profile の表記どおりに使う。` : '言語・資格・在留資格は、確認済みの表記だけを使う。',
    experienceGoal || growthGoal ? `今回の目的（${experienceGoal || growthGoal}）は志望動機で短く触れ、履歴書の事実欄には混ぜない。` : 'この求人に合わせた目的は志望動機で扱い、履歴書の事実欄は書き換えすぎない。',
  ]

  const { questions, questionsTiming } = buildQuestions(input)
  const savings = estimateMonthlySavings(job)
  const warnings = [
    '送信前に、在留資格・勤務開始日・期間・個室などの記載を自分で確認してください。',
    'この下書きは Profile と求人の構造化データだけを使っています。未確認の実績や条件は追加していません。',
  ]
  const factPack = facts.map((fact) => `- [${fact.source}] ${fact.label}: ${fact.value}`).join('\n') || '- 事実が不足しています。確認できない内容は [要確認] のままにしてください。'
  const polishPrompt = `あなたは日本語の応募書類編集者です。以下の事実パックと下書きだけを使い、志望動機と本人希望欄を自然で簡潔な日本語に整えてください。\n\n厳守事項：\n- 事実パックにない経験、資格、在留資格、勤務開始日、給与・住居条件を追加しない。\n- 不明な点は推測せず [要確認] と残す。\n- 志望動機は200字前後、本人希望欄は箇条書きを保つ。\n- 送信ではなく、本人が確認する草稿として出力する。\n\n事実パック\n${factPack}\n\n志望動機の下書き\n${motivationDraft}\n\n本人希望欄の下書き\n${desiredConditionsDraft}`

  return { motivationDraft, desiredConditionsDraft, resumeFocus, questions, questionsTiming, facts, warnings, savings, polishPrompt }
}
