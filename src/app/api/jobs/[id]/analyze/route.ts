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

  const highFitKeywords = [
    'hotel',
    'hostel',
    'guesthouse',
    'cafe',
    'reception',
    'front desk',
    'inbound',
    'tourism',
    'multilingual',
    'chinese',
    'japanese',
    'english',
    'sns',
    'pr',
    'event',
    'community',
    'react',
    'next.js',
    'nextjs',
    'typescript',
    'frontend',
    'ai',
  ]

  const lowFitKeywords = [
    'senior',
    'lead',
    'manager',
    'infrastructure',
    'kubernetes',
    'sre',
    'devops',
    'on-call',
    'backend-heavy',
    'business japanese',
    'native japanese',
    '日本語ネイティブ',
    'ビジネス日本語',
    'マネージャー',
    'シニア',
  ]

  const matchedHigh: string[] = []
  const matchedLow: string[] = []

  for (const k of highFitKeywords) {
    if (jobText.includes(k)) matchedHigh.push(k)
  }

  for (const k of lowFitKeywords) {
    if (jobText.includes(normalize(k))) matchedLow.push(k)
  }

  const strengths: string[] = []
  const gaps: string[] = []

  const profileSignals = [
    'hotel',
    'hostel',
    'guesthouse',
    'cafe',
    'reception',
    'front desk',
    'inbound',
    'tourism',
    'multilingual',
    'chinese',
    'japanese',
    'english',
    'sns',
    'pr',
    'event',
    'community',
    'react',
    'next.js',
    'typescript',
    'frontend',
    'ai',
  ].filter((k) => profileText.includes(k))

  for (const k of matchedHigh) {
    if (profileSignals.includes(k)) {
      strengths.push(`Keyword match: "${k}" appears in job + profile`)
    } else {
      strengths.push(`Keyword match: "${k}" appears in job posting`)
    }
  }

  for (const k of matchedLow) {
    gaps.push(`Potential risk: "${k}" signal in job posting`)
  }

  let score = 50
  score += matchedHigh.length * 6
  score -= matchedLow.length * 10

  if (includesAny(jobText, ['未経験', '初心者', '研修', 'entry', 'junior'])) {
    score += 6
    strengths.push('Junior/entry-friendly signal found in job posting')
  }

  if (
    includesAny(jobText, [
      '5+ years',
      '7+ years',
      '10+ years',
      'years of experience',
      '経験5年以上',
      '経験7年以上',
      '経験10年以上',
      '実務経験',
    ])
  ) {
    score -= 10
    gaps.push('May require significant experience (years/experience requirement detected)')
  }

  if (includesAny(jobText, ['ビザ', 'visa', 'sponsor', 'sponsorship'])) {
    strengths.push('Mentions visa/sponsorship (confirm details if needed)')
  }

  score = clampScore(score)

  const recommendedAction: RecommendedAction =
    score >= 75 ? 'apply' : score >= 45 ? 'maybe' : 'skip'

  const requiredSkills = uniq(
    matchedHigh.filter((k) =>
      ['reception', 'front desk', 'inbound', 'tourism', 'react', 'next.js', 'typescript', 'frontend'].includes(
        k
      )
    )
  )

  const bonusSkills = uniq(
    matchedHigh.filter((k) =>
      ['multilingual', 'chinese', 'japanese', 'english', 'sns', 'pr', 'event', 'community', 'ai'].includes(
        k
      )
    )
  )

  const resumeAdvice: string[] = []
  if (includesAny(jobText, ['hotel', 'hostel', 'guesthouse', 'reception', 'front desk'])) {
    resumeAdvice.push('Emphasize multilingual guest support, front desk support, and hospitality service experience.')
  }
  if (includesAny(jobText, ['sns', 'pr', 'event', 'community'])) {
    resumeAdvice.push('Highlight SNS/community operation and any event support experience with concrete outcomes.')
  }
  if (includesAny(jobText, ['react', 'next.js', 'typescript', 'frontend'])) {
    resumeAdvice.push('Position JobFit-AI as a practical portfolio: Next.js pages, API routes, and JSON persistence.')
  }
  if (resumeAdvice.length === 0) {
    resumeAdvice.push('Tailor the resume to the job keywords and explain how your experience maps to the daily tasks.')
  }

  const interviewPrep: string[] = []
  if (includesAny(jobText, ['reception', 'front desk', 'hotel', 'guesthouse', 'hostel'])) {
    interviewPrep.push('Prepare examples of handling guest questions, explaining rules clearly, and staying calm under pressure.')
  }
  if (includesAny(jobText, ['multilingual', 'chinese', 'japanese', 'english', '中国語', '英語', '日本語'])) {
    interviewPrep.push('Be ready to describe your language level with real situations (check-in, guidance, troubleshooting).')
  }
  if (includesAny(jobText, ['react', 'next.js', 'typescript', 'frontend'])) {
    interviewPrep.push('Be ready to walk through a small feature you built in JobFit-AI and what you learned.')
  }

  const summary = `Local placeholder analysis (v1). Score=${score} (${recommendedAction}). Matched high-fit keywords: ${uniq(matchedHigh).join(
    ', '
  ) || 'none'}. Low-fit signals: ${uniq(matchedLow).join(', ') || 'none'}.`

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

