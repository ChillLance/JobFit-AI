/**
 * Profile → analysis context helpers (TASK-029).
 *
 * These pure, side-effect-free functions convert an active `JapanCareerProfile`
 * into prompt-friendly text that becomes the *decision baseline* for job
 * analysis (local rules + Gemini/Groq prompts), replacing the previous
 * hard-coded candidate assumptions.
 *
 * Nothing here reads localStorage, files, or calls any AI service.
 */

import type {
  JapanCareerProfile,
  RemotePreference,
  ToleranceLevel,
} from './types'

function joinList(items: string[] | undefined): string {
  const cleaned = (items ?? [])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
  return cleaned.length > 0 ? cleaned.join('、') : '（未指定）'
}

function textOrUnknown(value: string | undefined): string {
  const s = (value ?? '').trim()
  return s || '（未指定）'
}

const TOLERANCE_LABELS: Record<ToleranceLevel, string> = {
  avoid: '無法接受 / 想避免',
  low: '接受度低',
  medium: '中等接受度',
  high: '接受度高',
  flexible: '彈性 / 可配合',
}

const REMOTE_LABELS: Record<RemotePreference, string> = {
  onsite: '到場辦公',
  hybrid: '混合（部分遠端）',
  remote: '遠端為主',
  flexible: '彈性',
  no_preference: '無特別偏好',
}

function toleranceLabel(value: ToleranceLevel): string {
  return TOLERANCE_LABELS[value] ?? String(value)
}

function remoteLabel(value: RemotePreference): string {
  return REMOTE_LABELS[value] ?? String(value)
}

function salaryLabel(monthly: number | null, annual: number | null): string {
  const parts: string[] = []
  if (typeof monthly === 'number' && Number.isFinite(monthly)) {
    parts.push(`月薪至少 ${monthly.toLocaleString('en-US')} 日圓`)
  }
  if (typeof annual === 'number' && Number.isFinite(annual)) {
    parts.push(`年薪至少 ${annual.toLocaleString('en-US')} 日圓`)
  }
  return parts.length > 0 ? parts.join('；') : '（未指定）'
}

/**
 * Convert the active profile into a detailed, prompt-friendly block of text.
 * This is the primary decision baseline injected into AI prompts.
 */
export function profileToAnalysisContext(profile: JapanCareerProfile): string {
  const { target, conditions, visa, languages, preferences, career } = profile

  const lines: string[] = [
    `Profile 名稱：${textOrUnknown(profile.name)}`,
    `求職方向描述：${textOrUnknown(profile.description)}`,
    '',
    '【期望條件】',
    `- 期望職種（desiredRoles）：${joinList(target.desiredRoles)}`,
    `- 期望地點（desiredLocations）：${joinList(target.desiredLocations)}`,
    `- 期望產業（industries）：${joinList(target.industries)}`,
    `- 有利配對關鍵字（preferredKeywords）：${joinList(target.preferredKeywords)}`,
    `- 可接受雇用型態（acceptableEmploymentTypes）：${joinList(conditions.acceptableEmploymentTypes)}`,
    `- 薪資期望：${salaryLabel(conditions.minimumMonthlySalary, conditions.minimumAnnualSalary)}`,
    '',
    '【工作型態接受度】',
    `- 加班（overtime）：${toleranceLabel(conditions.overtimeTolerance)}`,
    `- 輪班（shift）：${toleranceLabel(conditions.shiftWorkTolerance)}`,
    `- 夜班（night shift）：${toleranceLabel(conditions.nightShiftTolerance)}`,
    `- 轉勤調動（transfer / 転勤）：${toleranceLabel(conditions.transferTolerance)}`,
    `- 遠端偏好（remote）：${remoteLabel(conditions.remotePreference)}`,
    '',
    '【簽證 / 在留資格】',
    `- 目前狀態：${textOrUnknown(visa.currentStatus)}`,
    `- 是否需要公司提供簽證支援：${visa.needsVisaSupport ? '是（需要簽證支援）' : '否（不需簽證支援）'}`,
    `- 簽證備註：${textOrUnknown(visa.notes)}`,
    '',
    '【語言能力】',
    `- 日文程度：${textOrUnknown(languages.japaneseLevel)}`,
    `- 英文程度：${textOrUnknown(languages.englishLevel)}`,
    `- 其他語言：${joinList(languages.otherLanguages)}`,
    '',
    '【偏好與底線】',
    `- 重視的價值觀（values）：${joinList(preferences.values)}`,
    `- 絕對無法接受（dealBreakers）：${joinList(preferences.dealBreakers)}`,
    `- 想避免的風險（risksToAvoid）：${joinList(preferences.risksToAvoid)}`,
    '',
    '【優勢與技能】',
    `- 核心優勢（strengths）：${joinList(profile.strengths)}`,
    `- 可轉移技能（transferableSkills）：${joinList(profile.transferableSkills)}`,
    '',
    '【職涯方向】',
    `- 目前方向（currentDirection）：${textOrUnknown(career.currentDirection)}`,
    `- 職涯目標（careerGoal）：${textOrUnknown(career.careerGoal)}`,
    `- 未來願景（futureVision）：${textOrUnknown(career.futureVision)}`,
    `- 是否願意轉換職涯跑道（openToCareerChange）：${career.openToCareerChange ? '是' : '否'}`,
    '',
    `【其他備註】：${textOrUnknown(profile.notes)}`,
  ]

  return lines.join('\n')
}

/**
 * A short one/two-line summary of the active profile, useful for compact UI
 * labels and log lines.
 */
export function profileToShortSummary(profile: JapanCareerProfile): string {
  const roles = joinList(profile.target.desiredRoles)
  const locations = joinList(profile.target.desiredLocations)
  const goal =
    profile.career.careerGoal?.trim() ||
    profile.career.futureVision?.trim() ||
    ''

  const base = `${textOrUnknown(profile.name)}｜職種：${roles}｜地點：${locations}`
  return goal ? `${base}｜目標：${goal}` : base
}

/**
 * Flatten a `JapanCareerProfile` into the loose, flat profile shape that the
 * shared compact-input builder (`buildCompactProfileInput` / `buildLocalSignals`
 * in compactInput.ts) already understands. This lets the existing
 * Gemini/Groq input pipeline consume the new profile without changing its
 * field-reading logic.
 */
export function flattenProfileForCompactInput(
  profile: JapanCareerProfile
): Record<string, unknown> {
  const languages: string[] = []
  if (profile.languages.japaneseLevel?.trim()) {
    languages.push(`日本語（${profile.languages.japaneseLevel.trim()}）`)
  }
  if (profile.languages.englishLevel?.trim()) {
    languages.push(`英語（${profile.languages.englishLevel.trim()}）`)
  }
  for (const other of profile.languages.otherLanguages ?? []) {
    if (typeof other === 'string' && other.trim()) languages.push(other.trim())
  }

  return {
    profileVersion: `${profile.id}@${profile.updatedAt}`,
    summary: profile.description,
    targetRoles: profile.target.desiredRoles,
    desiredRoles: profile.target.desiredRoles,
    preferredLocations: profile.target.desiredLocations,
    locationPreference: profile.target.desiredLocations,
    industries: profile.target.industries,
    preferredKeywords: profile.target.preferredKeywords,
    skills: [...profile.strengths, ...profile.transferableSkills],
    languages,
    preferences: profile.preferences.values,
    dealBreakers: [
      ...profile.preferences.dealBreakers,
      ...profile.preferences.risksToAvoid,
    ],
    avoidConditions: [
      ...profile.preferences.dealBreakers,
      ...profile.preferences.risksToAvoid,
    ],
    workPreferences: {
      locations: profile.target.desiredLocations,
      rolePreferences: profile.target.desiredRoles,
      avoid: [
        ...profile.preferences.dealBreakers,
        ...profile.preferences.risksToAvoid,
      ],
    },
  }
}
