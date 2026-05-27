import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

type Params = {
  params: Promise<{
    id: string
  }>
}

type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  collectedAt?: string
  company?: string
}

type UserProfile = {
  profileVersion?: number
  summary?: string
  targetRoles?: string[]
  careerDirections?: {
    primary?: string[]
    secondary?: string[]
  }
  skills?: {
    strong?: string[]
    familiar?: string[]
    learning?: string[]
  }
  languages?: Array<{
    language?: string
    level?: string
    notes?: string
  }>
}

type RecommendedAction = 'apply' | 'maybe' | 'skip'

type AnalyzeResponse = {
  jobId: string
  source: 'local-placeholder'
  analysisVersion: 1
  fitScore: number
  recommendedAction: RecommendedAction
  summary: string
  strengths: string[]
  gaps: string[]
  requiredSkills: string[]
  bonusSkills: string[]
  resumeAdvice: string[]
  interviewPrep: string[]
  metadata: {
    jobTitle: string
    company: string
    profileVersion: number
  }
}

const jobsFilePath = path.join(process.cwd(), 'jobs_temp.json')
const profileFilePath = path.join(process.cwd(), 'user_profile.json')

async function readJsonFile<T>(filePath: string, label: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    if (!content.trim()) {
      throw new Error(`${label} is empty`)
    }
    return JSON.parse(content) as T
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read ${label}: ${message}`)
  }
}

function clampScore(n: number) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function uniq(items: string[]) {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)))
}

function normalize(text: string) {
  return text.toLowerCase()
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n))
}

function makeAnalysis(job: Job, profile: UserProfile): AnalyzeResponse {
  const jobTitle = job.title || ''
  const company = job.company || ''
  const rawText = job.rawText || ''

  const profileVersion =
    typeof profile.profileVersion === 'number' ? profile.profileVersion : 1

  const profileTextParts: string[] = [
    profile.summary || '',
    ...(profile.targetRoles || []),
    ...(profile.careerDirections?.primary || []),
    ...(profile.careerDirections?.secondary || []),
    ...(profile.skills?.strong || []),
    ...(profile.skills?.familiar || []),
    ...(profile.skills?.learning || []),
    ...((profile.languages || []).flatMap((l) => [
      l.language || '',
      l.level || '',
      l.notes || '',
    ]) as string[]),
  ]

  const jobText = normalize(`${jobTitle}\n${company}\n${rawText}`)
  const profileText = normalize(profileTextParts.join('\n'))

  // Keyword groups for more structured matching
  const hospitalityKeywords = [
    'hotel',
    'hostel',
    'guesthouse',
    'cafe',
    'reception',
    'front desk',
    'inbound',
    'tourism',
    'customer service',
    // Japanese hospitality / front desk
    'ホテル',
    'フロント',
    '受付',
    'レセプション',
    '宿泊',
    '旅館',
    'ゲストハウス',
    'ホステル',
    'チェックイン',
    'チェックアウト',
    '夜勤',
    'ナイトフロント',
    '客室',
    '接客',
    'お客様対応',
    '観光',
    '旅行',
    'インバウンド',
    '外国人対応',
  ]

  const languageKeywords = [
    'multilingual',
    'chinese',
    'japanese',
    'english',
    '中国語',
    '英語',
    '日本語',
    '外国語',
    '多言語',
    'バイリンガル',
    '台湾',
    '中国',
    '海外',
    '留学生',
    'n2',
    'jlpt',
  ]

  const snsPrKeywords = [
    'sns',
    'instagram',
    'insta',
    'tiktok',
    '広報',
    'pr',
    'マーケティング',
    'marketing',
    'イベント',
    'event',
    'コミュニティ',
    'community',
    '写真',
    '撮影',
    'canva',
  ]

  const cafeServiceKeywords = [
    'カフェ',
    '飲食',
    'ホール',
    'レジ',
    '接客販売',
    'サービススタッフ',
  ]

  const juniorFriendlyKeywords = [
    '未経験',
    '未経験歓迎',
    '学歴不問',
    '研修あり',
    '初心者',
    'ブランクok',
    '第二新卒',
    'アルバイト',
    'パート',
    '契約社員',
    'entry',
    'junior',
  ]

  const webFrontendKeywords = [
    'react',
    'next.js',
    'nextjs',
    'typescript',
    'javascript',
    'フロントエンド',
    'frontend',
    'web',
    'ai',
    '生成ai',
    'チャットボット',
    'アプリ開発',
  ]

  const lowFitKeywords = [
    'senior',
    'lead',
    'manager',
    '店長',
    '支配人',
    'マネージャー',
    '責任者',
    'リーダー経験必須',
    '実務経験3年以上',
    '実務経験５年以上',
    '実務経験5年以上',
    '実務経験３年以上',
    '実務経験７年以上',
    '実務経験7年以上',
    'ネイティブレベル',
    'native japanese',
    'business japanese',
    'ビジネスレベル日本語必須',
    'ビジネス日本語',
    '法人営業経験',
    'infrastructure',
    'インフラ',
    'サーバー',
    'backend-heavy',
    'バックエンド専門',
    'java必須',
    'php必須',
    '運転免許必須',
    'kubernetes',
    'sre',
    'devops',
    'on-call',
    'シニア',
  ]

  const matchedHigh: string[] = []
  const matchedLow: string[] = []

  function collectMatches(source: string[], label: string) {
    const hits: string[] = []
    for (const k of source) {
      if (jobText.includes(k)) {
        hits.push(k)
        matchedHigh.push(k)
      }
    }
    return uniq(hits)
  }

  const hospitalityHits = collectMatches(hospitalityKeywords, 'hospitality')
  const languageHits = collectMatches(languageKeywords, 'language')
  const snsPrHits = collectMatches(snsPrKeywords, 'snspr')
  const cafeServiceHits = collectMatches(cafeServiceKeywords, 'cafe')
  const juniorHits = collectMatches(juniorFriendlyKeywords, 'junior')
  const webFrontendHits = collectMatches(webFrontendKeywords, 'web')

  for (const k of lowFitKeywords) {
    if (jobText.includes(normalize(k))) matchedLow.push(k)
  }

  const strengths: string[] = []
  const gaps: string[] = []

  const profileSignals = [
    ...hospitalityKeywords,
    ...languageKeywords,
    ...snsPrKeywords,
    ...cafeServiceKeywords,
    ...juniorFriendlyKeywords,
    ...webFrontendKeywords,
  ].filter((k) => profileText.includes(k))

  const hasProfileHospitality = hospitalityHits.some((k) =>
    profileSignals.includes(k)
  )
  const hasProfileLanguage = languageHits.some((k) =>
    profileSignals.includes(k)
  )
  const hasProfileWeb = webFrontendHits.some((k) =>
    profileSignals.includes(k)
  )

  if (hospitalityHits.length > 0) {
    strengths.push(
      hasProfileHospitality
        ? 'Hospitality / front desk signals appear in both job posting and your profile.'
        : 'Strong hospitality / front desk signals found in the job posting.'
    )
  }

  if (languageHits.length > 0) {
    strengths.push(
      hasProfileLanguage
        ? 'Language / multilingual requirements align with your profile.'
        : 'Language / multilingual guest support signals found in the job posting.'
    )
  }

  if (snsPrHits.length > 0) {
    strengths.push(
      'SNS / PR / event or community support experience would be useful for this role.'
    )
  }

  if (cafeServiceHits.length > 0) {
    strengths.push(
      'Customer-facing cafe / service work signals appear in the job posting.'
    )
  }

  if (juniorHits.length > 0) {
    strengths.push('Junior / entry-friendly signals found (未経験歓迎・研修あり 等)。')
  }

  if (webFrontendHits.length > 0) {
    strengths.push(
      hasProfileWeb
        ? 'Web / frontend / AI-assisted development keywords align with your current projects.'
        : 'Web / frontend / AI-related keywords appear in the job posting.'
    )
  }

  for (const k of matchedLow) {
    gaps.push(`Caution: "${k}" signal detected (may indicate higher bar or mismatch).`)
  }

  let score = 48

  // Hospitality is a strong target direction
  if (hospitalityHits.length > 0) {
    score += 14
  }

  // Language / inbound guests
  if (languageHits.length > 0) {
    score += 10
  }

  // SNS / PR / events
  if (snsPrHits.length > 0) {
    score += 6
  }

  // Cafe / service work
  if (cafeServiceHits.length > 0) {
    score += 4
  }

  // Junior-friendly
  if (juniorHits.length > 0) {
    score += 8
  }

  // Web / frontend / AI roles
  if (webFrontendHits.length > 0) {
    score += 6
  }

  // Penalize low-fit / senior-only signals, but per category, not per occurrence
  if (
    includesAny(jobText, [
      'senior',
      'lead',
      'manager',
      '店長',
      '支配人',
      'マネージャー',
      'シニア',
    ])
  ) {
    score -= 10
  }

  if (
    includesAny(jobText, [
      '実務経験3年以上',
      '実務経験５年以上',
      '実務経験5年以上',
      '実務経験７年以上',
      '実務経験7年以上',
      '5+ years',
      '7+ years',
      '10+ years',
      'years of experience',
      '実務経験',
    ])
  ) {
    score -= 8
    gaps.push('May require several years of professional experience.')
  }

  if (
    includesAny(jobText, [
      'ネイティブレベル',
      'native japanese',
      'ビジネスレベル日本語必須',
      'ビジネス日本語',
    ])
  ) {
    score -= 6
    gaps.push('Language requirement may be strict (native / business level Japanese).')
  }

  if (
    includesAny(jobText, [
      'インフラ',
      'infrastructure',
      'サーバー',
      'backend-heavy',
      'バックエンド専門',
      'java必須',
      'php必須',
    ])
  ) {
    score -= 6
    gaps.push('Role may be backend-heavy or infrastructure-focused.')
  }

  if (includesAny(jobText, ['ビザ', 'visa', 'sponsor', 'sponsorship'])) {
    strengths.push('Mentions visa/sponsorship (confirm details and eligibility in advance).')
  }

  score = clampScore(score)

  const recommendedAction: RecommendedAction =
    score >= 75 ? 'apply' : score >= 45 ? 'maybe' : 'skip'

  const requiredSkills = uniq([
    ...(hospitalityHits.length > 0
      ? ['Customer service', 'Basic Japanese communication', 'Front desk / reception support']
      : []),
    ...(languageHits.length > 0 ? ['Language support / multilingual communication'] : []),
    ...(webFrontendHits.length > 0 ? ['Basic web / frontend development understanding'] : []),
  ])

  const bonusSkills = uniq([
    ...(languageHits.length > 0
      ? ['Chinese / English communication', 'Experience with inbound guests or tourists']
      : []),
    ...(snsPrHits.length > 0 ? ['SNS operation (Instagram / TikTok)', 'PR / event support experience'] : []),
    ...(cafeServiceHits.length > 0 ? ['Cafe / restaurant customer service experience'] : []),
  ])

  const resumeAdvice: string[] = []
  if (hospitalityHits.length > 0) {
    resumeAdvice.push(
      'Emphasize hotel, front desk, guesthouse, or other hospitality experience, including night shifts or check-in support.'
    )
  }
  if (languageHits.length > 0) {
    resumeAdvice.push(
      'Describe concrete situations where you used languages (Chinese, English, Japanese) to help guests or customers.'
    )
  }
  if (snsPrHits.length > 0) {
    resumeAdvice.push(
      'Highlight SNS / community operations, PR, event support, and include metrics or concrete results when possible.'
    )
  }
  if (webFrontendHits.length > 0) {
    resumeAdvice.push(
      'Position JobFit-AI and other projects as a practical portfolio: explain the features you implemented and tools you used (React / Next.js / TypeScript).'
    )
  }
  if (resumeAdvice.length === 0) {
    resumeAdvice.push(
      'Tailor your resume around the main tasks in the job posting and connect them to your past experiences.'
    )
  }

  const interviewPrep: string[] = []
  if (
    hospitalityHits.length > 0 ||
    includesAny(jobText, ['reception', 'front desk', 'hotel', 'guesthouse', 'hostel'])
  ) {
    interviewPrep.push(
      'Prepare stories about handling guest questions, explaining rules clearly, and staying calm during problems (check-in / check-out situations).'
    )
  }
  if (
    languageHits.length > 0 ||
    includesAny(jobText, ['multilingual', 'chinese', 'japanese', 'english', '中国語', '英語', '日本語'])
  ) {
    interviewPrep.push(
      'Be ready to describe your language level with real scenarios (guiding guests, solving issues, telephone or email support).'
    )
  }
  if (snsPrHits.length > 0) {
    interviewPrep.push(
      'Prepare examples of SNS posts, events, or campaigns you helped with, and what outcome they achieved.'
    )
  }
  if (webFrontendHits.length > 0) {
    interviewPrep.push(
      'Be ready to walk through a small feature you built in JobFit-AI or another project, including what problem it solved and what you learned.'
    )
  }
  if (interviewPrep.length === 0) {
    interviewPrep.push(
      'Review the main responsibilities in the job posting and prepare 2–3 concrete stories that show you can handle similar situations.'
    )
  }

  const highFitCategories: string[] = []
  if (hospitalityHits.length > 0) highFitCategories.push('hospitality / front desk')
  if (languageHits.length > 0) highFitCategories.push('language / multilingual')
  if (snsPrHits.length > 0) highFitCategories.push('SNS / PR / events')
  if (cafeServiceHits.length > 0) highFitCategories.push('cafe / service')
  if (juniorHits.length > 0) highFitCategories.push('junior / entry-friendly')
  if (webFrontendHits.length > 0) highFitCategories.push('web / frontend / AI')

  const summary = `Local placeholder analysis (v1). Score=${score} (${recommendedAction}). High-fit categories: ${highFitCategories.join(
    ', '
  ) || 'none'}. Caution signals: ${uniq(matchedLow).join(', ') || 'none'}.`

  return {
    jobId: job.id,
    source: 'local-placeholder',
    analysisVersion: 1,
    fitScore: score,
    recommendedAction,
    summary,
    strengths: uniq(strengths).slice(0, 12),
    gaps: uniq(gaps).slice(0, 12),
    requiredSkills: requiredSkills.slice(0, 12),
    bonusSkills: bonusSkills.slice(0, 12),
    resumeAdvice: uniq(resumeAdvice).slice(0, 8),
    interviewPrep: uniq(interviewPrep).slice(0, 8),
    metadata: {
      jobTitle,
      company,
      profileVersion,
    },
  }
}

export async function POST(_request: Request, context: Params) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'Missing job id' },
        {
          status: 400,
        }
      )
    }

    let jobsRaw: unknown
    try {
      jobsRaw = await readJsonFile<unknown>(jobsFilePath, 'jobs_temp.json')
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }

    if (!Array.isArray(jobsRaw)) {
      return NextResponse.json(
        { error: 'jobs_temp.json is not an array' },
        { status: 500 }
      )
    }

    const jobs = jobsRaw as Job[]
    const job = jobs.find((j) => j?.id === id)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', jobId: id },
        { status: 404 }
      )
    }

    let profile: UserProfile
    try {
      profile = await readJsonFile<UserProfile>(profileFilePath, 'user_profile.json')
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }

    const result = makeAnalysis(job, profile)
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/jobs/[id]/analyze failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

