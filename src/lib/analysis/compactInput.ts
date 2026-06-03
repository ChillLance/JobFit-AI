// Shared compact analysis input builder (TASK-021).
// Gemini and Groq routes use this so both providers analyze the SAME compact
// data, keeping token usage bounded and results comparable.
//
// This module is intentionally dependency-free (no fs / no provider imports) so
// it can be reused from any server route without circular dependencies.

// Hard cap on the cleaned job text we send to the model (token safety).
export const MAX_JOB_TEXT_CHARS = 2500

// ---------------------------------------------------------------------------
// Relevant Job Digest limits (TASK-021.3)
// ---------------------------------------------------------------------------

// Per-section digest item count / length caps.
export const MAX_DIGEST_ITEMS_PER_SECTION = 5
export const MAX_DIGEST_ITEM_CHARS = 300

// Evidence snippet caps (original-text proof windows).
export const MAX_EVIDENCE_SNIPPETS = 8
export const MAX_EVIDENCE_TOTAL_CHARS = 1400
export const EVIDENCE_BEFORE_CHARS = 120
export const EVIDENCE_AFTER_CHARS = 240

// Fallback (unclassified-but-maybe-useful) caps.
export const MAX_FALLBACK_ITEMS = 6
export const MAX_FALLBACK_TOTAL_CHARS = 1200

// ---------------------------------------------------------------------------
// Relevant Job Digest types (TASK-021.3)
// ---------------------------------------------------------------------------

export type EvidenceSnippet = {
  type:
    | 'risk'
    | 'requirements'
    | 'workingHours'
    | 'salary'
    | 'employmentType'
    | 'location'
    | 'benefits'
    | 'responsibilities'
    | 'fallback'
    | 'other'
  keyword: string
  source: 'preview' | 'tail' | 'full'
  text: string
}

export type JobDigest = {
  responsibilities: string[]
  requirements: string[]
  workingHours: string[]
  salary: string[]
  employmentType: string[]
  location: string[]
  benefits: string[]
  risks: string[]
  unknowns: string[]
  evidenceSnippets: EvidenceSnippet[]
  fallbackImportantText: string[]
  digestStats: {
    sourceTextChars: number
    boilerplateRemovedLineCount: number
    boilerplateRemovedPhraseCount: number
    digestTextChars: number
    extractedItemCount: number
    evidenceSnippetCount: number
    tailEvidenceSnippetCount: number
    fallbackItemCount: number
    fallbackTextChars: number
  }
}

export type CompactAnalysisInput = {
  job: {
    id?: string
    title: string
    company?: string
    location?: string
    salary?: string
    employmentType?: string
    cleanedTextPreview: string
    keySections?: {
      requirements?: string
      responsibilities?: string
      benefits?: string
      workingHours?: string
      salary?: string
      location?: string
    }
  }
  profile: {
    targetRoles?: string[]
    skills?: string[]
    languages?: string[]
    locationPreference?: string[]
    experienceSummary?: string
    preferences?: string[]
    avoidConditions?: string[]
  }
  // Conservative, high-recall digest extracted from the FULL cleaned job text
  // (TASK-021.3). This — not cleanedTextPreview — is the primary text source
  // the prompt relies on.
  jobDigest: JobDigest
  localSignals: {
    matchedKeywords: string[]
    riskKeywords: string[]
    positiveSignals: string[]
    negativeSignals: string[]
    unknowns: string[]
    localScore?: number | null
  }
  // Boilerplate-stripped continuous text, kept ONLY as a supplementary fallback
  // for the model (never the primary source).
  fallbackTextPreview?: string
  inputMeta: {
    version: 'relevant_job_digest_v1'
    maxTextChars: number
    createdAt: string
  }
  // Diagnostics about how much of the raw job text actually reached the model
  // (TASK-021.2). Stored in analysis metadata; never includes full job text.
  // Preserved alongside the digest — it reports truncation, not content.
  inputCoverage: InputCoverageReport
}

// ---------------------------------------------------------------------------
// InputCoverageReport (TASK-021.2)
// ---------------------------------------------------------------------------

export type SectionCoverageStatus = 'included' | 'tail_only' | 'missing'

export type InputCoverageReport = {
  rawLength: number
  cleanedFullLength: number
  previewLength: number
  tailLength: number
  wasTruncated: boolean
  keywordCoverage: {
    inPreview: string[]
    onlyInTail: string[]
    lostAfterCleaning: string[]
  }
  sectionCoverage: {
    requirements: SectionCoverageStatus
    salary: SectionCoverageStatus
    workingHours: SectionCoverageStatus
    employmentType: SectionCoverageStatus
    location: SectionCoverageStatus
    risks: SectionCoverageStatus
  }
  warningLevel: 'ok' | 'partial' | 'risky'
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Small safe accessors (no throwing on missing / wrong-typed fields)
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getOptionalString(value: unknown): string | undefined {
  const s = typeof value === 'string' ? value.trim() : ''
  return s || undefined
}

function getStringArray(value: unknown, max = 30): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) =>
      typeof item === 'string' ? item.trim() : String(item ?? '').trim()
    )
    .filter(Boolean)
    .slice(0, max)
}

// Return the first source that yields a non-empty string array.
function firstStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    const arr = getStringArray(value)
    if (arr.length > 0) return arr
  }
  return []
}

// Read the richest available body text from a job record, in priority order.
function getJobBodyText(jobRecord: Record<string, unknown>): string {
  return (
    getString(jobRecord.description) ||
    getString(jobRecord.rawText) ||
    getString(jobRecord.text) ||
    getString(jobRecord.content)
  )
}

// ---------------------------------------------------------------------------
// cleanJobText / cleanJobTextFull
// ---------------------------------------------------------------------------

// Full, deterministic cleanup of arbitrary job text WITHOUT truncation.
// - null/undefined -> ''
// - coerce to string
// - strip HTML tags
// - decode &nbsp; to a space
// - collapse whitespace, trim
// Used by the input coverage report so we can inspect the tail that gets cut.
export function cleanJobTextFull(text: unknown): string {
  if (text === null || text === undefined) return ''

  let s = typeof text === 'string' ? text : String(text)

  // Remove HTML tags.
  s = s.replace(/<[^>]*>/g, ' ')

  // Decode the most common entity we see in scraped postings.
  s = s.replace(/&nbsp;/gi, ' ')

  // Collapse all runs of whitespace into a single space, then trim.
  s = s.replace(/\s+/g, ' ').trim()

  return s
}

// Same cleaning rules as cleanJobTextFull, then capped at MAX_JOB_TEXT_CHARS
// (token safety — this is what the model actually sees).
export function cleanJobText(text: unknown): string {
  return cleanJobTextFull(text).slice(0, MAX_JOB_TEXT_CHARS)
}

// ---------------------------------------------------------------------------
// keySections (lightweight keyword slice — intentionally not over-engineered)
// ---------------------------------------------------------------------------

// Grab a short window of text starting at the first matching keyword.
// Returns undefined when no keyword is found, so callers can omit the field.
function sliceSection(
  text: string,
  keywords: string[],
  maxLen = 300
): string | undefined {
  if (!text) return undefined
  const lower = text.toLowerCase()

  for (const kw of keywords) {
    const idx = lower.indexOf(kw.toLowerCase())
    if (idx >= 0) {
      const slice = text.slice(idx, idx + maxLen).trim()
      if (slice) return slice
    }
  }

  return undefined
}

function buildKeySections(
  jobRecord: Record<string, unknown>,
  cleanedText: string
): CompactAnalysisInput['job']['keySections'] {
  const sections: NonNullable<CompactAnalysisInput['job']['keySections']> = {}

  const requirements = sliceSection(cleanedText, [
    '応募資格',
    '応募条件',
    '必須',
    '要件',
    '資格',
    'requirements',
    'スキル',
  ])
  if (requirements) sections.requirements = requirements

  const responsibilities = sliceSection(cleanedText, [
    '仕事内容',
    '業務内容',
    '職務内容',
    '担当業務',
    'responsibilities',
  ])
  if (responsibilities) sections.responsibilities = responsibilities

  const benefits = sliceSection(cleanedText, [
    '待遇',
    '福利厚生',
    '手当',
    '各種保険',
    'benefits',
  ])
  if (benefits) sections.benefits = benefits

  const workingHours = sliceSection(cleanedText, [
    '勤務時間',
    '就業時間',
    'シフト',
    'working hours',
  ])
  if (workingHours) sections.workingHours = workingHours

  // Prefer the structured field; fall back to a keyword slice.
  const salary =
    getOptionalString(jobRecord.salary) ??
    sliceSection(cleanedText, ['給与', '時給', '月給', '年収', 'salary'])
  if (salary) sections.salary = salary

  const location =
    getOptionalString(jobRecord.location) ??
    sliceSection(cleanedText, ['勤務地', '所在地', 'アクセス', 'location'])
  if (location) sections.location = location

  return Object.keys(sections).length > 0 ? sections : undefined
}

// ---------------------------------------------------------------------------
// buildCompactJobInput
// ---------------------------------------------------------------------------

export function buildCompactJobInput(job: unknown): CompactAnalysisInput['job'] {
  const j = asRecord(job)

  const bodyText = getJobBodyText(j)

  const cleaned = cleanJobText(bodyText)

  // Honor an existing cleanedTextPreview if present, but always re-cap it.
  const preview = cleanJobText(getString(j.cleanedTextPreview) || cleaned)

  return {
    id: getOptionalString(j.id),
    title: getString(j.title),
    company: getOptionalString(j.company),
    location: getOptionalString(j.location),
    salary: getOptionalString(j.salary),
    employmentType: getOptionalString(j.employmentType),
    cleanedTextPreview: preview,
    keySections: buildKeySections(j, cleaned),
  }
}

// ---------------------------------------------------------------------------
// buildCompactProfileInput
// ---------------------------------------------------------------------------

// Flatten the profile skills, which may be an array or an object grouped by
// strength. Falls back to a `hardSkills` array if present.
function flattenProfileSkills(profileRecord: Record<string, unknown>): string[] {
  const direct = profileRecord.skills

  if (Array.isArray(direct)) {
    return getStringArray(direct, 40)
  }

  const grouped = asRecord(direct)
  const combined = [
    ...getStringArray(grouped.strong),
    ...getStringArray(grouped.familiar),
    ...getStringArray(grouped.learning),
  ]
  if (combined.length > 0) return combined.slice(0, 40)

  return getStringArray(profileRecord.hardSkills, 40)
}

// Flatten languages into readable strings like "Japanese（JLPT N2）".
function flattenProfileLanguages(
  profileRecord: Record<string, unknown>
): string[] {
  const langs = profileRecord.languages

  if (Array.isArray(langs)) {
    const out = langs
      .map((entry) => {
        if (typeof entry === 'string') return entry.trim()
        const r = asRecord(entry)
        const name = getString(r.language).trim()
        const level = getString(r.level).trim()
        if (name && level) return `${name}（${level}）`
        return name || level
      })
      .filter(Boolean)

    if (out.length > 0) return out.slice(0, 12)
  }

  return getStringArray(profileRecord.languageSkills, 12)
}

export function buildCompactProfileInput(
  profile: unknown
): CompactAnalysisInput['profile'] {
  const p = asRecord(profile)
  const workPreferences = asRecord(p.workPreferences)

  const targetRoles = firstStringArray(
    p.targetRoles,
    p.desiredRoles,
    p.target_jobs
  )

  const skills = flattenProfileSkills(p)
  const languages = flattenProfileLanguages(p)

  const locationPreference = firstStringArray(
    p.locationPreference,
    p.preferredLocations,
    workPreferences.locations
  )

  const experienceSummary =
    getOptionalString(p.experienceSummary) ??
    getOptionalString(p.summary) ??
    getOptionalString(p.background)

  const preferences = firstStringArray(
    p.preferences,
    p.jobPreferences,
    workPreferences.rolePreferences
  )

  const avoidConditions = firstStringArray(
    p.avoidConditions,
    p.dealBreakers,
    workPreferences.avoid
  )

  return {
    targetRoles: targetRoles.length ? targetRoles.slice(0, 16) : undefined,
    skills: skills.length ? skills : undefined,
    languages: languages.length ? languages : undefined,
    locationPreference: locationPreference.length
      ? locationPreference
      : undefined,
    experienceSummary,
    preferences: preferences.length ? preferences.slice(0, 12) : undefined,
    avoidConditions: avoidConditions.length
      ? avoidConditions.slice(0, 12)
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// buildLocalSignals (conservative, auxiliary-only keyword scan)
// ---------------------------------------------------------------------------

// Generic Japanese job-market signals (not tied to a specific candidate).
const BASE_POSITIVE_KEYWORDS = [
  'ホテル',
  'フロント',
  '接客',
  '英語',
  '中国語',
  '通訳',
  '翻訳',
  '事務',
  'カスタマーサポート',
]

const RISK_KEYWORDS = [
  '夜勤',
  '固定残業代',
  '派遣',
  '契約社員',
  'ノルマ',
  '転勤',
  '残業',
  '立ち仕事',
]

// Human-readable interpretation for matched positive keywords.
const POSITIVE_SIGNAL_LABELS: Record<string, string> = {
  ホテル: '屬於旅宿相關職務（符合主要方向）',
  フロント: '包含前台／櫃台工作（符合接待經驗）',
  接客: '需要接客服務能力（符合服務經驗）',
  英語: '需要英語能力（符合語言優勢）',
  中国語: '需要中文能力（符合母語優勢）',
  通訳: '可能涉及口譯工作（符合多語言能力）',
  翻訳: '可能涉及翻譯工作（符合多語言能力）',
  事務: '包含事務／行政工作（符合基礎辦公能力）',
  カスタマーサポート: '屬於客戶支援工作（符合服務經驗）',
}

// Build a profile-specific positive keyword list from the active career profile
// (TASK-029). Falls back to generic market keywords when the profile is empty.
function buildProfilePositiveKeywords(profile: unknown): string[] {
  const p = asRecord(profile)
  const workPreferences = asRecord(p.workPreferences)

  const fromProfile = [
    ...getStringArray(p.preferredKeywords, 24),
    ...firstStringArray(p.targetRoles, p.desiredRoles),
    ...firstStringArray(p.locationPreference, p.preferredLocations, workPreferences.locations),
    ...getStringArray(p.industries, 12),
  ]

  const merged = Array.from(
    new Set([...fromProfile, ...BASE_POSITIVE_KEYWORDS].map((s) => s.trim()).filter(Boolean))
  )
  return merged.slice(0, 40)
}

// Human-readable interpretation for matched risk keywords.
const RISK_SIGNAL_LABELS: Record<string, string> = {
  夜勤: '可能包含夜勤班別',
  固定残業代: '薪資可能含固定加班費，需確認實際工時',
  派遣: '可能為派遣雇用形態',
  契約社員: '可能為契約社員（非正社員）',
  ノルマ: '可能有業績配額壓力',
  転勤: '可能需要轉勤／調動工作地點',
  残業: '可能有加班需求',
  立ち仕事: '可能需要長時間站立工作',
}

export function buildLocalSignals(
  job: unknown,
  profile?: unknown
): CompactAnalysisInput['localSignals'] {
  const j = asRecord(job)

  const bodyText = getJobBodyText(j)

  const text = `${getString(j.title)}\n${getString(j.company)}\n${bodyText}`
  const textLower = text.toLowerCase()

  const positiveKeywords = buildProfilePositiveKeywords(profile)
  const matchedKeywords = positiveKeywords.filter((kw) =>
    textLower.includes(kw.toLowerCase())
  )

  const p = asRecord(profile)
  const workPreferences = asRecord(p.workPreferences)
  const dealBreakerTerms = [
    ...firstStringArray(p.dealBreakers, p.avoidConditions, workPreferences.avoid),
  ]

  const riskKeywords = Array.from(
    new Set([
      ...RISK_KEYWORDS.filter((kw) => text.includes(kw)),
      ...dealBreakerTerms.filter((term) =>
        term.length >= 2 && textLower.includes(term.toLowerCase())
      ),
    ])
  )

  const positiveSignals: string[] = matchedKeywords
    .map((kw) => POSITIVE_SIGNAL_LABELS[kw] ?? `職缺出現與你的設定檔相關的關鍵字：${kw}`)
    .filter(Boolean)

  const preferredLocations = firstStringArray(
    p.locationPreference,
    p.preferredLocations,
    workPreferences.locations
  )
  for (const loc of preferredLocations) {
    if (loc && textLower.includes(loc.toLowerCase())) {
      positiveSignals.push(`工作地點符合偏好地區（${loc}）`)
    }
  }

  const negativeSignals = [
    ...riskKeywords
      .filter((kw) => RISK_KEYWORDS.includes(kw))
      .map((kw) => RISK_SIGNAL_LABELS[kw])
      .filter(Boolean),
    ...dealBreakerTerms
      .filter(
        (term) =>
          term.length >= 2 &&
          textLower.includes(term.toLowerCase()) &&
          !RISK_KEYWORDS.includes(term)
      )
      .map((term) => `職缺可能觸及你的設定檔地雷：${term}`),
  ]

  // Conservative "we couldn't confirm this from the text" flags.
  const unknowns: string[] = []
  if (!/ビザ|ビザサポート|visa|sponsor/i.test(text)) {
    unknowns.push('visa_support_unknown')
  }
  if (!/昇進|昇格|キャリアパス|キャリアアップ|promotion|career path/i.test(text)) {
    unknowns.push('promotion_path_unknown')
  }
  if (!/リモート|在宅|テレワーク|remote|work from home/i.test(text)) {
    unknowns.push('remote_work_unknown')
  }

  // Light heuristic only — never used to gate / skip AI analysis.
  const base = 50
  const positiveBonus = Math.min(matchedKeywords.length * 5, 30)
  const riskPenalty = Math.min(riskKeywords.length * 5, 25)
  const localScore = Math.max(
    0,
    Math.min(100, base + positiveBonus - riskPenalty)
  )

  return {
    matchedKeywords,
    riskKeywords,
    positiveSignals,
    negativeSignals,
    unknowns,
    localScore,
  }
}

// ---------------------------------------------------------------------------
// buildInputCoverageReport (TASK-021.2)
// ---------------------------------------------------------------------------

// Keyword groups we check coverage for. Order/content is intentional: these are
// the "must not silently drop" pieces of a Japanese job posting.
const COVERAGE_KEYWORDS = {
  requirements: [
    '応募資格',
    '応募条件',
    '必須条件',
    '歓迎条件',
    '経験者',
    '未経験',
    '日本語',
    'N1',
    'N2',
    'JLPT',
    '英語',
    '中国語',
  ],
  salary: [
    '給与',
    '時給',
    '月給',
    '年収',
    '固定残業代',
    '交通費',
    '賞与',
    '昇給',
    '試用期間',
  ],
  workingHours: [
    '勤務時間',
    'シフト',
    '夜勤',
    '早番',
    '遅番',
    '休日',
    '週休',
    '土日',
    '残業',
  ],
  employmentType: ['正社員', '契約社員', '派遣', 'アルバイト', 'パート', '業務委託'],
  location: ['勤務地', '福岡', '博多', '天神', '在宅', 'リモート', '転勤'],
  risks: [
    'ノルマ',
    '固定残業代',
    '夜勤',
    '転勤',
    '派遣',
    '契約更新',
    '立ち仕事',
    'クレーム',
    '残業',
  ],
} as const

// Flat, de-duplicated list of every keyword we track.
const ALL_COVERAGE_KEYWORDS: string[] = Array.from(
  new Set(Object.values(COVERAGE_KEYWORDS).flat())
)

function classifySection(
  keywords: readonly string[],
  previewLower: string,
  tailLower: string
): SectionCoverageStatus {
  if (keywords.some((kw) => previewLower.includes(kw.toLowerCase()))) {
    return 'included'
  }
  if (keywords.some((kw) => tailLower.includes(kw.toLowerCase()))) {
    return 'tail_only'
  }
  return 'missing'
}

// Compare the raw job text, the fully-cleaned text, and the (capped) preview the
// model actually sees, to detect important information lost to truncation or
// cleaning. Never returns the full job text — only lengths + keyword/section flags.
export function buildInputCoverageReport(
  rawText: unknown,
  cleanedPreview: string
): InputCoverageReport {
  const rawString =
    rawText === null || rawText === undefined
      ? ''
      : typeof rawText === 'string'
        ? rawText
        : String(rawText)

  const cleanedFullText = cleanJobTextFull(rawText)
  const preview = cleanedPreview
  const tail = cleanedFullText.slice(MAX_JOB_TEXT_CHARS)

  const rawLower = rawString.toLowerCase()
  const cleanedFullLower = cleanedFullText.toLowerCase()
  const previewLower = preview.toLowerCase()
  const tailLower = tail.toLowerCase()

  const wasTruncated = cleanedFullText.length > MAX_JOB_TEXT_CHARS

  const inPreview: string[] = []
  const onlyInTail: string[] = []
  const lostAfterCleaning: string[] = []

  for (const kw of ALL_COVERAGE_KEYWORDS) {
    const lower = kw.toLowerCase()

    if (previewLower.includes(lower)) {
      inPreview.push(kw)
    } else if (tailLower.includes(lower)) {
      onlyInTail.push(kw)
    }

    // Present in the raw text but gone after cleaning (e.g. only lived inside an
    // HTML tag / attribute that we stripped).
    if (rawLower.includes(lower) && !cleanedFullLower.includes(lower)) {
      lostAfterCleaning.push(kw)
    }
  }

  const sectionCoverage = {
    requirements: classifySection(
      COVERAGE_KEYWORDS.requirements,
      previewLower,
      tailLower
    ),
    salary: classifySection(COVERAGE_KEYWORDS.salary, previewLower, tailLower),
    workingHours: classifySection(
      COVERAGE_KEYWORDS.workingHours,
      previewLower,
      tailLower
    ),
    employmentType: classifySection(
      COVERAGE_KEYWORDS.employmentType,
      previewLower,
      tailLower
    ),
    location: classifySection(
      COVERAGE_KEYWORDS.location,
      previewLower,
      tailLower
    ),
    risks: classifySection(COVERAGE_KEYWORDS.risks, previewLower, tailLower),
  }

  const riskKeywordsLower = new Set(
    COVERAGE_KEYWORDS.risks.map((kw) => kw.toLowerCase())
  )
  const riskKeywordOnlyInTail = onlyInTail.some((kw) =>
    riskKeywordsLower.has(kw.toLowerCase())
  )

  const sectionValues = Object.values(sectionCoverage)
  const anyTailOnly = sectionValues.includes('tail_only')

  let warningLevel: InputCoverageReport['warningLevel']
  if (
    sectionCoverage.risks === 'tail_only' ||
    sectionCoverage.requirements === 'tail_only' ||
    sectionCoverage.salary === 'tail_only' ||
    riskKeywordOnlyInTail
  ) {
    warningLevel = 'risky'
  } else if (wasTruncated && anyTailOnly) {
    warningLevel = 'partial'
  } else {
    warningLevel = 'ok'
  }

  const warnings: string[] = []
  if (wasTruncated) {
    warnings.push('職缺文字已被截斷，部分資訊未送入模型。')
  }
  if (sectionCoverage.risks === 'tail_only' || riskKeywordOnlyInTail) {
    warnings.push('風險關鍵字只出現在截斷尾段，模型可能未直接看到。')
  }
  if (sectionCoverage.requirements === 'tail_only') {
    warnings.push('応募條件/資格資訊只出現在截斷尾段。')
  }
  if (
    sectionCoverage.salary === 'tail_only' ||
    sectionCoverage.employmentType === 'tail_only'
  ) {
    warnings.push('給与/雇用條件資訊只出現在截斷尾段。')
  }
  if (lostAfterCleaning.length > 0) {
    warnings.push('部分關鍵字在清理後消失，可能原本夾在 HTML 標籤內。')
  }

  return {
    rawLength: rawString.length,
    cleanedFullLength: cleanedFullText.length,
    previewLength: preview.length,
    tailLength: tail.length,
    wasTruncated,
    keywordCoverage: {
      inPreview,
      onlyInTail,
      lostAfterCleaning,
    },
    sectionCoverage,
    warningLevel,
    warnings,
  }
}

// ---------------------------------------------------------------------------
// Relevant Job Digest (TASK-021.3)
// ---------------------------------------------------------------------------

type DigestSection =
  | 'responsibilities'
  | 'requirements'
  | 'workingHours'
  | 'salary'
  | 'employmentType'
  | 'location'
  | 'benefits'
  | 'risks'

// Important keyword groups used to extract (high recall) relevant job info.
const DIGEST_KEYWORD_GROUPS: Record<DigestSection, string[]> = {
  responsibilities: [
    '仕事内容',
    '業務内容',
    '職務内容',
    'お仕事内容',
    '担当業務',
    '接客',
    'フロント',
    '受付',
    '予約',
    '電話対応',
    'チェックイン',
    'チェックアウト',
    '通訳',
    '翻訳',
    '事務',
    'カスタマーサポート',
  ],
  requirements: [
    '応募資格',
    '応募条件',
    '必須条件',
    '歓迎条件',
    '経験者',
    '未経験',
    '日本語',
    'N1',
    'N2',
    'JLPT',
    '英語',
    '中国語',
    'PC',
    'Excel',
    'Word',
    '学歴',
    '資格',
  ],
  workingHours: [
    '勤務時間',
    'シフト',
    '夜勤',
    '早番',
    '遅番',
    '休日',
    '週休',
    '土日',
    '残業',
    '休憩',
    '時間外',
  ],
  salary: [
    '給与',
    '時給',
    '月給',
    '年収',
    '固定残業代',
    '交通費',
    '賞与',
    '昇給',
    '試用期間',
    '手当',
  ],
  employmentType: [
    '正社員',
    '契約社員',
    '派遣',
    'アルバイト',
    'パート',
    '業務委託',
    '雇用形態',
    '契約期間',
    '契約更新',
  ],
  location: [
    '勤務地',
    '福岡',
    '博多',
    '天神',
    '在宅',
    'リモート',
    '転勤',
    '駅',
    '徒歩',
  ],
  benefits: [
    '福利厚生',
    '社会保険',
    '交通費支給',
    '研修',
    '昇給',
    '賞与',
    '正社員登用',
    '有給',
    '休暇',
  ],
  risks: [
    'ノルマ',
    '固定残業代',
    '夜勤',
    '転勤',
    '派遣',
    '契約更新',
    '立ち仕事',
    'クレーム',
    '残業',
    '契約社員',
    '試用期間',
    '時間外',
  ],
}

// Map a digest section name to the EvidenceSnippet `type` (risks → 'risk').
function sectionToEvidenceType(section: DigestSection): EvidenceSnippet['type'] {
  return section === 'risks' ? 'risk' : section
}

// Flat, de-duplicated list of every important keyword across all groups.
const ALL_DIGEST_KEYWORDS: string[] = Array.from(
  new Set(Object.values(DIGEST_KEYWORD_GROUPS).flat())
)

// Extra protected tokens (beyond the keyword groups) that must never be removed
// as boilerplate because they almost always indicate real job content.
const PROTECTED_EXTRA_TOKENS = [
  '応募',
  '資格',
  '福利厚生',
  '仕事内容',
  '給与',
  '勤務地',
  '勤務時間',
  '雇用形態',
  '時間',
]

// Very explicit website / UI boilerplate phrases. Conservative on purpose:
// a segment is only dropped when it contains one of these AND contains no
// protected content (numbers, money, time, keywords, etc.).
const BOILERPLATE_PATTERNS = [
  'メインコンテンツに移動',
  'ホーム',
  '企業クチコミ',
  '給与調査',
  '求人広告掲載',
  'ログイン',
  '保存しました',
  'この求人に簡単応募',
  '応募画面に進む',
  '求人を見る',
  'Cookie',
  '利用規約',
  'プライバシー',
  'Indeed',
  'メッセージ',
  '通知',
  'ヘルプ',
  'フッター',
]

// Phrase-level UI boilerplate (TASK-021.3.1). The Chrome extension often
// captures the posting as one continuous line, so the line/segment scan below
// never matches these. We strip them surgically from the continuous text — only
// the matched phrase is removed, never a whole segment — so real job content
// around them is preserved. Specific UI phrases first; the few ambiguous short
// nav tokens are boundary-guarded so we never bite into real words.
const BOILERPLATE_PHRASE_PATTERNS: RegExp[] = [
  /メインコンテンツに移動/g,
  /未読メッセージの件数/g,
  /企業クチコミ/g,
  /給与調査/g,
  /求人広告掲載/g,
  /応募画面に進む/g,
  /この求人に簡単応募/g,
  /保存済み/g,
  /保存しました/g,
  /new update/gi,
  /利用規約/g,
  /プライバシー(?:ポリシー)?/g,
  /Cookie(?:\s*(?:設定|ポリシー))?/gi,
  // Pagination widgets: "slide1 of 5", "slide 3 of 5", etc.
  /slide\s*\d+\s*of\s*\d+/gi,
  // Bare single-digit pagination ("1/5"). Standalone-token + single-digit
  // guards keep dates (2026/5/29) and salary/working-hour ratios safe.
  /(?<!\S)\d\/\d(?!\S)/g,
  // Short navigation tokens — boundary-guarded against Japanese word chars so
  // we never split real words like ホテル / ホームヘルパー / メッセージアプリ.
  /(?<![ァ-ヶーぁ-ん一-龠])ホーム(?![ァ-ヶーぁ-ん一-龠])/g,
  /(?<![ァ-ヶーぁ-ん一-龠])メッセージ(?![ァ-ヶーぁ-ん一-龠])/g,
]

// Split text into coarse segments ("lines") for boilerplate / digest scanning.
// The cleaned text has collapsed whitespace, so we split on sentence
// punctuation, newlines, and a few structural separators.
function splitSegments(text: string): string[] {
  return text
    .split(/(?<=[。．.!！?？\n])|[｜|・►▶▸•‣／]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// True when a segment contains content that must never be dropped as
// boilerplate: a digit, money, time, or any protected/important keyword.
function containsProtectedContent(segment: string): boolean {
  if (/[0-9０-９]/.test(segment)) return true // 数字
  if (/円|¥|￥/.test(segment)) return true // 日圓
  if (/時|分|時間/.test(segment)) return true // 時間
  for (const kw of ALL_DIGEST_KEYWORDS) {
    if (segment.includes(kw)) return true
  }
  for (const kw of PROTECTED_EXTRA_TOKENS) {
    if (segment.includes(kw)) return true
  }
  return false
}

// Conservatively strip website/UI boilerplate from the full cleaned text.
// Two passes:
//   1. Phrase-level cleanup (TASK-021.3.1) — surgically removes known UI phrases
//      from the continuous text (handles raw text with no line breaks).
//   2. Line/segment-level removal (original conservative behavior) — drops a
//      segment only when it matches a boilerplate phrase AND has no protected
//      content, so real job content is never dropped.
export function removeBoilerplateText(cleanedFullText: string): {
  text: string
  removedLineCount: number
  removedPhraseCount: number
} {
  if (!cleanedFullText) {
    return { text: '', removedLineCount: 0, removedPhraseCount: 0 }
  }

  // ---- Pass 1: phrase-level cleanup on continuous text --------------------
  let removedPhraseCount = 0
  let phraseCleaned = cleanedFullText
  for (const pattern of BOILERPLATE_PHRASE_PATTERNS) {
    phraseCleaned = phraseCleaned.replace(pattern, () => {
      removedPhraseCount += 1
      return ' '
    })
  }
  // Collapse whitespace introduced by phrase removal.
  phraseCleaned = phraseCleaned.replace(/\s+/g, ' ').trim()

  // ---- Pass 2: conservative line/segment removal --------------------------
  const segments = splitSegments(phraseCleaned)
  const kept: string[] = []
  let removedLineCount = 0

  for (const segment of segments) {
    const isBoilerplate = BOILERPLATE_PATTERNS.some((p) => segment.includes(p))
    if (isBoilerplate && !containsProtectedContent(segment)) {
      removedLineCount += 1
      continue
    }
    kept.push(segment)
  }

  return { text: kept.join(' '), removedLineCount, removedPhraseCount }
}

// Normalize for overlap comparison (drop spaces, lowercase).
function normalizeForOverlap(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase()
}

// Two snippets are considered duplicates when one normalized text contains the
// other, or they share a long identical prefix.
function isHighlyOverlapping(a: string, b: string): boolean {
  const na = normalizeForOverlap(a)
  const nb = normalizeForOverlap(b)
  if (!na || !nb) return false
  if (na.includes(nb) || nb.includes(na)) return true
  const prefixLen = Math.min(60, na.length, nb.length)
  return prefixLen >= 30 && na.slice(0, prefixLen) === nb.slice(0, prefixLen)
}

function classifyEvidenceSource(
  index: number,
  previewLength: number
): EvidenceSnippet['source'] {
  if (index < 0) return 'full'
  if (index < previewLength) return 'preview'
  return 'tail'
}

// Priority rank for keeping evidence (lower = keep first). Tail risk / tail
// hard-condition evidence is prioritized so important late-text info survives.
function evidenceRank(snippet: EvidenceSnippet): number {
  const { source, type } = snippet
  const hardTail =
    type === 'requirements' ||
    type === 'workingHours' ||
    type === 'salary' ||
    type === 'employmentType'

  if (source === 'tail' && type === 'risk') return 0
  if (source === 'tail' && hardTail) return 1
  if (type === 'risk') return 2
  if (type === 'requirements') return 3
  if (type === 'workingHours') return 4
  if (type === 'salary') return 5
  if (type === 'employmentType') return 6
  if (type === 'location' || type === 'benefits' || type === 'responsibilities')
    return 7
  return 8
}

// Scan the (boilerplate-removed) full text for important keywords and capture a
// surrounding window as original-text evidence. Tail evidence (originally past
// the preview cut) is prioritized so important late info is recovered.
export function extractEvidenceSnippets(
  cleanedText: string,
  previewLength: number
): EvidenceSnippet[] {
  if (!cleanedText) return []

  const lower = cleanedText.toLowerCase()
  const candidates: EvidenceSnippet[] = []
  const seenKeyType = new Set<string>()

  for (const [section, keywords] of Object.entries(DIGEST_KEYWORD_GROUPS) as [
    DigestSection,
    string[],
  ][]) {
    const type = sectionToEvidenceType(section)

    for (const keyword of keywords) {
      const index = lower.indexOf(keyword.toLowerCase())
      if (index < 0) continue

      const keyType = `${type}::${keyword}`
      if (seenKeyType.has(keyType)) continue
      seenKeyType.add(keyType)

      const start = Math.max(0, index - EVIDENCE_BEFORE_CHARS)
      const end = Math.min(
        cleanedText.length,
        index + keyword.length + EVIDENCE_AFTER_CHARS
      )
      const text = cleanedText.slice(start, end).trim()
      if (!text) continue

      candidates.push({
        type,
        keyword,
        source: classifyEvidenceSource(index, previewLength),
        text,
      })
    }
  }

  candidates.sort((a, b) => evidenceRank(a) - evidenceRank(b))

  const selected: EvidenceSnippet[] = []
  let totalChars = 0

  for (const candidate of candidates) {
    if (selected.length >= MAX_EVIDENCE_SNIPPETS) break

    const duplicate = selected.some((s) =>
      isHighlyOverlapping(s.text, candidate.text)
    )
    if (duplicate) continue

    if (totalChars + candidate.text.length > MAX_EVIDENCE_TOTAL_CHARS) {
      // Skip oversized late candidates but keep scanning for smaller ones.
      continue
    }

    selected.push(candidate)
    totalChars += candidate.text.length
  }

  return selected
}

function truncateItem(text: string, max: number): string {
  const t = text.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

// Signals that an unclassified sentence is probably still useful job content.
const FALLBACK_USEFUL_REGEX =
  /円|¥|￥|月|時|週|日|年|駅|徒歩|歓迎|経験|研修|サポート|環境|チーム|[0-9０-９]/

// Build a conservative, high-recall digest from the FULL cleaned job text.
// Removes explicit boilerplate, extracts categorized info + original-text
// evidence, and keeps anything unclassified-but-plausibly-useful in
// fallbackImportantText so important info is not silently dropped.
export function buildJobDigest(
  cleanedFullText: string,
  _profile?: unknown
): JobDigest {
  const sourceTextChars = cleanedFullText.length

  const {
    text: digestSource,
    removedLineCount,
    removedPhraseCount,
  } = removeBoilerplateText(cleanedFullText)

  const sentences = splitSegments(digestSource)

  // ---- Section classification -------------------------------------------
  const sections: Record<DigestSection, string[]> = {
    responsibilities: [],
    requirements: [],
    workingHours: [],
    salary: [],
    employmentType: [],
    location: [],
    benefits: [],
    risks: [],
  }

  const usedSentences = new Set<string>()

  for (const [section, keywords] of Object.entries(DIGEST_KEYWORD_GROUPS) as [
    DigestSection,
    string[],
  ][]) {
    for (const sentence of sentences) {
      if (sections[section].length >= MAX_DIGEST_ITEMS_PER_SECTION) break
      const matches = keywords.some((kw) => sentence.includes(kw))
      if (!matches) continue

      const item = truncateItem(sentence, MAX_DIGEST_ITEM_CHARS)
      const norm = normalizeForOverlap(item)
      const dup = sections[section].some(
        (existing) => normalizeForOverlap(existing) === norm
      )
      if (dup) continue

      sections[section].push(item)
      usedSentences.add(sentence)
    }
  }

  // ---- Evidence snippets ------------------------------------------------
  const evidenceSnippets = extractEvidenceSnippets(
    digestSource,
    MAX_JOB_TEXT_CHARS
  )

  // ---- Unknowns (conservative "not found in text" flags) ----------------
  const unknowns: string[] = []
  if (!/visa|ビザ|就労資格|在留資格/i.test(digestSource)) {
    unknowns.push('visa_support_unknown')
  }
  if (!/正社員登用|昇進|昇格|キャリア/.test(digestSource)) {
    unknowns.push('promotion_path_unknown')
  }
  if (!/在宅|リモート|テレワーク/.test(digestSource)) {
    unknowns.push('remote_work_unknown')
  }

  // ---- Fallback important text ------------------------------------------
  // Unclassified sentences that don't look like boilerplate but may be useful.
  type FallbackCandidate = { text: string; nearKeyword: boolean }
  const fallbackCandidates: FallbackCandidate[] = []
  const seenFallback = new Set<string>()

  for (const sentence of sentences) {
    if (usedSentences.has(sentence)) continue

    const looksUseful =
      FALLBACK_USEFUL_REGEX.test(sentence) ||
      (sentence.length >= 30 && sentence.length <= 300)
    if (!looksUseful) continue

    const isBoilerplate =
      BOILERPLATE_PATTERNS.some((p) => sentence.includes(p)) &&
      !containsProtectedContent(sentence)
    if (isBoilerplate) continue

    const norm = normalizeForOverlap(sentence)
    if (!norm || seenFallback.has(norm)) continue
    seenFallback.add(norm)

    const nearKeyword = ALL_DIGEST_KEYWORDS.some((kw) => sentence.includes(kw))
    fallbackCandidates.push({ text: sentence, nearKeyword })
  }

  // Prefer sentences near an important keyword, then longer ones.
  fallbackCandidates.sort((a, b) => {
    if (a.nearKeyword !== b.nearKeyword) return a.nearKeyword ? -1 : 1
    return b.text.length - a.text.length
  })

  const fallbackImportantText: string[] = []
  let fallbackChars = 0
  for (const candidate of fallbackCandidates) {
    if (fallbackImportantText.length >= MAX_FALLBACK_ITEMS) break
    const item = truncateItem(candidate.text, MAX_DIGEST_ITEM_CHARS)
    if (fallbackChars + item.length > MAX_FALLBACK_TOTAL_CHARS) continue
    fallbackImportantText.push(item)
    fallbackChars += item.length
  }

  const extractedItemCount = Object.values(sections).reduce(
    (sum, items) => sum + items.length,
    0
  )
  const tailEvidenceSnippetCount = evidenceSnippets.filter(
    (s) => s.source === 'tail'
  ).length
  const fallbackTextChars = fallbackImportantText.reduce(
    (sum, t) => sum + t.length,
    0
  )

  return {
    responsibilities: sections.responsibilities,
    requirements: sections.requirements,
    workingHours: sections.workingHours,
    salary: sections.salary,
    employmentType: sections.employmentType,
    location: sections.location,
    benefits: sections.benefits,
    risks: sections.risks,
    unknowns,
    evidenceSnippets,
    fallbackImportantText,
    digestStats: {
      sourceTextChars,
      boilerplateRemovedLineCount: removedLineCount,
      boilerplateRemovedPhraseCount: removedPhraseCount,
      digestTextChars: digestSource.length,
      extractedItemCount,
      evidenceSnippetCount: evidenceSnippets.length,
      tailEvidenceSnippetCount,
      fallbackItemCount: fallbackImportantText.length,
      fallbackTextChars,
    },
  }
}

// ---------------------------------------------------------------------------
// buildAnalysisInput
// ---------------------------------------------------------------------------

export function buildAnalysisInput(
  job: unknown,
  profile: unknown
): CompactAnalysisInput {
  const jobInput = buildCompactJobInput(job)
  const bodyText = getJobBodyText(asRecord(job))

  // Full cleaned text feeds the conservative digest (high-recall extraction).
  const cleanedFullText = cleanJobTextFull(bodyText)
  const jobDigest = buildJobDigest(cleanedFullText, profile)

  // Supplementary-only continuous fallback text (boilerplate removed, capped).
  const { text: digestSource } = removeBoilerplateText(cleanedFullText)
  const fallbackTextPreview = digestSource.slice(0, MAX_JOB_TEXT_CHARS)

  // inputCoverage (TASK-021.2) is preserved: it reports truncation, not content.
  const inputCoverage = buildInputCoverageReport(
    bodyText,
    jobInput.cleanedTextPreview
  )

  return {
    job: jobInput,
    profile: buildCompactProfileInput(profile),
    jobDigest,
    localSignals: buildLocalSignals(job, profile),
    fallbackTextPreview,
    inputMeta: {
      version: 'relevant_job_digest_v1',
      maxTextChars: MAX_JOB_TEXT_CHARS,
      createdAt: new Date().toISOString(),
    },
    inputCoverage,
  }
}

// ---------------------------------------------------------------------------
// buildJobFitPrompt (shared user prompt for Gemini + Groq)
// ---------------------------------------------------------------------------

export function buildJobFitPrompt(
  input: CompactAnalysisInput,
  options?: { profileContext?: string }
): string {
  // Active career profile context becomes the primary decision baseline
  // (TASK-029). When provided, it is injected as the highest-priority profile
  // information and the prompt is told to prefer it over any assumption.
  const profileContext = options?.profileContext?.trim()
  const profileContextBlock = profileContext
    ? `\n【0. 使用中的職涯設定檔（主要判斷基準，請優先採用）】\n${profileContext}\n`
    : ''
  const profileBaselineInstruction = profileContext
    ? `0. 請以「使用中的職涯設定檔」作為主要的判斷基準（primary decision baseline）。不要對求職者做任何寫死的假設；一切以此設定檔為準。
0a. 請明確區分「這個人是否做得來這份工作（can do）」與「依據這份設定檔是否值得投遞（should apply）」兩件事，並在 summary 與 recommendation 反映此區分。
0b. 請特別注意設定檔中的：絕對地雷（dealBreakers）、未來願景（futureVision）、簽證需求（visa）、語言能力（language）、薪資（salary）、地點（location）、職種（role）以及工作型態限制（加班／輪班／夜班／轉勤／遠端）。
`
    : ''

  // 1. 基本職缺欄位（title/company/location/salary/employmentType）。
  const basicJobFields = {
    title: input.job.title,
    company: input.job.company,
    location: input.job.location,
    salary: input.job.salary,
    employmentType: input.job.employmentType,
  }

  // 2. jobDigest 核心分類（不含 evidence / fallback，稍後分開呈現以利模型理解）。
  const digestCore = {
    responsibilities: input.jobDigest.responsibilities,
    requirements: input.jobDigest.requirements,
    workingHours: input.jobDigest.workingHours,
    salary: input.jobDigest.salary,
    employmentType: input.jobDigest.employmentType,
    location: input.jobDigest.location,
    benefits: input.jobDigest.benefits,
    risks: input.jobDigest.risks,
    unknowns: input.jobDigest.unknowns,
  }

  const supplementaryText =
    input.fallbackTextPreview || input.job.cleanedTextPreview || ''

  return `你是一位熟悉日本就職市場的職涯顧問。請根據以下資料，分析這份職缺與求職者的整體匹配度。

${profileBaselineInstruction}資料優先順序（由高到低）：
1. 基本職缺欄位（title/company/location/salary/employmentType）。
2. jobDigest：從「完整職缺內容」保守抽取出的重點，是你主要的判斷依據。
3. evidenceSnippets：原文證據片段；source 為 "tail" 代表原本位於職缺後段（過去常被截斷而看不到），請特別重視。
4. fallbackImportantText：尚未分類但可能有用的內容，可用來補充判斷。
5. localSignals：本地關鍵字訊號，僅為輔助，不可取代 evidence，可被上述職缺內容推翻。
6. 補充原文（supplementaryText）：僅供補充參考，不是主要依據。

判讀原則：
1. jobDigest 與 evidenceSnippets 是主要依據；請優先採用它們，而非補充原文。
2. inputCoverage 是診斷資訊（用來判斷是否截斷／是否可能漏資訊），不是內容判斷依據。
3. unknowns 代表原文中未找到明確資訊（如簽證、晉升、遠端），請不要自行假設有或沒有，必要時放入需向雇主確認的事項。
4. 若 evidence 或 digest 中出現「夜勤なし」「転勤なし」「ノルマなし」等否定句，請不要當成風險扣分。
5. 若 evidence 或 digest 中出現「夜勤」「固定残業代」「契約社員」「派遣」「転勤」「残業」等且「不是否定句」，請務必反映在 risks。
6. 不要僅因 localScore 偏高或偏低就直接給高分或低分；請獨立評估。
7. 分析需務實、具體，綜合考量：職稱、公司、地點、薪資、雇用形態、職務內容、求職者背景、語言能力、相關經驗、風險、入門友善度與發展性。

輸出規則：
1. 只輸出「單一合法 JSON 物件」，不要 markdown、不要程式碼區塊、不要任何額外說明文字。
2. JSON 必須能被 JavaScript JSON.parse() 直接解析，不要輸出 trailing comma。
3. 除 fitScore 為數字外，所有文字欄位請使用「繁體中文」。
4. fitScore 為 0 到 100 的整數。
5. recommendation 為簡短的繁體中文建議（例如「建議投遞」「可以考慮」「暫不建議」）。

請輸出符合以下結構的 JSON（欄位名稱必須完全一致）：
{
  "fitScore": <0-100 整數>,
  "recommendation": "<繁體中文，簡短建議>",
  "summary": "<繁體中文摘要，2-4 句>",
  "strengths": ["<繁體中文>"],
  "gaps": ["<繁體中文>"],
  "risks": ["<繁體中文，例如夜勤、派遣、年資、簽證等風險>"],
  "suggestedActions": ["<繁體中文，建議的具體行動，例如履歷重點、面試準備、向雇主確認的問題>"]
}
${profileContextBlock}
【1. 基本職缺欄位】
${JSON.stringify(basicJobFields, null, 2)}

【2. jobDigest（主要依據，從完整職缺內容保守抽取）】
${JSON.stringify(digestCore, null, 2)}

【3. evidenceSnippets（原文證據；source=tail 代表原本在後段，請重視）】
${JSON.stringify(input.jobDigest.evidenceSnippets, null, 2)}

【4. fallbackImportantText（未分類但可能有用）】
${JSON.stringify(input.jobDigest.fallbackImportantText, null, 2)}

【5. 求職者精簡個人檔案】
${JSON.stringify(input.profile, null, 2)}

【6. localSignals（輔助用，可被職缺內容推翻，不可取代 evidence）】
${JSON.stringify(input.localSignals, null, 2)}

【7. 補充原文（supplementaryText，僅供補充，非主要依據）】
${supplementaryText}

再次提醒：你的最終輸出必須只是一個可以被 JSON.parse() 解析的 JSON object，第一個字元必須是 {，最後一個字元必須是 }。`
}
