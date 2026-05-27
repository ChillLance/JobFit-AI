import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { hasGeminiApiKey } from '@/lib/aiConfig'

// Server-side Gemini deep analysis only — manual POST; never auto-called.

const GEMINI_MODEL = 'gemini-1.5-flash'
const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models'

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
  location?: string
  salary?: string
  employmentType?: string
}

type UserProfile = {
  profileVersion?: number | string
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
  [key: string]: unknown
}

type RecommendedAction = 'apply' | 'maybe' | 'skip'

type DeepAnalysisResponse = {
  jobId: string
  analysisType: 'gemini-deep'
  analysisVersion: 'gemini-v1'
  fitScore: number
  recommendedAction: RecommendedAction
  summary: string
  strengths: string[]
  gaps: string[]
  riskFactors: string[]
  requiredSkills: string[]
  bonusSkills: string[]
  resumeAdvice: string[]
  interviewPrep: string[]
  questionsToAskEmployer: string[]
  metadata: {
    source: 'gemini'
    model: string
    profileVersion: string | number
    createdAt: string
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

function clampScore(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function normalizeRecommendedAction(value: unknown): RecommendedAction {
  if (value === 'apply' || value === 'maybe' || value === 'skip') {
    return value
  }
  const s = String(value ?? '').toLowerCase()
  if (s === 'apply' || s.includes('投遞') || s.includes('建議')) return 'apply'
  if (s === 'skip' || s.includes('跳過') || s.includes('不建議')) return 'skip'
  return 'maybe'
}

function toStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()))
    .filter(Boolean)
    .slice(0, max)
}

function sanitizePreview(text: string, maxLen = 240): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= maxLen) return oneLine
  return `${oneLine.slice(0, maxLen)}…`
}

function extractJsonFromText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch?.[1]) return fenceMatch[1].trim()

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

function buildGeminiPrompt(job: Job, profile: UserProfile): string {
  const profileVersion =
    profile.profileVersion !== undefined && profile.profileVersion !== null
      ? profile.profileVersion
      : 1

  const jobPayload = {
    id: job.id,
    title: job.title ?? '',
    company: job.company ?? '',
    location: job.location ?? '',
    salary: job.salary ?? '',
    employmentType: job.employmentType ?? '',
    url: job.url ?? '',
    source: job.source ?? '',
    collectedAt: job.collectedAt ?? '',
    rawText: (job.rawText ?? '').slice(0, 12000),
  }

  return `你是一位熟悉日本就職市場的職涯顧問。請根據以下「職缺資料」與「求職者個人檔案」，進行深度職缺適合度分析。

重要規則：
1. 所有面向使用者的文字欄位必須使用「繁體中文」撰寫（summary、strengths、gaps、riskFactors、requiredSkills、bonusSkills、resumeAdvice、interviewPrep、questionsToAskEmployer）。
2. recommendedAction 只能使用英文小寫：apply、maybe、skip（不可使用中文）。
3. fitScore 為 0 到 100 的整數。
4. 分析要務實、具體，需考量：職稱、公司、地點、薪資、雇用形態、職缺描述、求職者背景、日文能力、旅宿／前台適性、語言優勢、夜勤風險、派遣／契約風險（若有）、入門友善度、履歷與面試策略。
5. 只輸出「單一 JSON 物件」，不要 markdown、不要程式碼區塊、不要額外說明文字。

請輸出符合以下結構的 JSON（欄位名稱必須完全一致）：
{
  "jobId": "${job.id}",
  "analysisType": "gemini-deep",
  "analysisVersion": "gemini-v1",
  "fitScore": <0-100 整數>,
  "recommendedAction": "apply" | "maybe" | "skip",
  "summary": "<繁體中文摘要，2-4 句>",
  "strengths": ["<繁體中文>"],
  "gaps": ["<繁體中文>"],
  "riskFactors": ["<繁體中文，例如夜勤、派遣、年資、簽證等風險>"],
  "requiredSkills": ["<繁體中文>"],
  "bonusSkills": ["<繁體中文>"],
  "resumeAdvice": ["<繁體中文>"],
  "interviewPrep": ["<繁體中文>"],
  "questionsToAskEmployer": ["<繁體中文，建議向雇主確認的問題>"]
}

職缺資料（JSON）：
${JSON.stringify(jobPayload, null, 2)}

求職者個人檔案（JSON，profileVersion=${profileVersion}）：
${JSON.stringify(profile, null, 2)}`
}

async function callGemini(
  prompt: string,
  apiKey: string
): Promise<{ text: string; model: string }> {
  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  })

  const rawBody = await response.text()

  if (!response.ok) {
    let detail = rawBody
    try {
      const errJson = JSON.parse(rawBody) as {
        error?: { message?: string }
      }
      detail = errJson.error?.message || rawBody
    } catch {
      // keep rawBody
    }
    throw new Error(
      `Gemini API request failed (${response.status}): ${sanitizePreview(detail, 400)}`
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw new Error('Gemini API returned non-JSON response envelope')
  }

  const candidates = (payload as { candidates?: unknown[] }).candidates
  const first = Array.isArray(candidates) ? candidates[0] : undefined
  const parts = (first as { content?: { parts?: unknown[] } })?.content?.parts
  const textPart = Array.isArray(parts)
    ? parts.find((p) => typeof (p as { text?: string }).text === 'string')
    : undefined
  const text = (textPart as { text?: string } | undefined)?.text?.trim()

  if (!text) {
    throw new Error('Gemini API returned empty content')
  }

  return { text, model: GEMINI_MODEL }
}

function normalizeDeepAnalysis(
  parsed: Record<string, unknown>,
  jobId: string,
  profileVersion: string | number,
  model: string
): DeepAnalysisResponse {
  const createdAt = new Date().toISOString()

  return {
    jobId: typeof parsed.jobId === 'string' ? parsed.jobId : jobId,
    analysisType: 'gemini-deep',
    analysisVersion: 'gemini-v1',
    fitScore: clampScore(Number(parsed.fitScore)),
    recommendedAction: normalizeRecommendedAction(parsed.recommendedAction),
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    strengths: toStringArray(parsed.strengths),
    gaps: toStringArray(parsed.gaps),
    riskFactors: toStringArray(parsed.riskFactors),
    requiredSkills: toStringArray(parsed.requiredSkills),
    bonusSkills: toStringArray(parsed.bonusSkills),
    resumeAdvice: toStringArray(parsed.resumeAdvice),
    interviewPrep: toStringArray(parsed.interviewPrep),
    questionsToAskEmployer: toStringArray(parsed.questionsToAskEmployer),
    metadata: {
      source: 'gemini',
      model,
      profileVersion,
      createdAt,
    },
  }
}

export async function POST(_request: Request, context: Params) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    if (!hasGeminiApiKey()) {
      return NextResponse.json(
        {
          error:
            'Gemini API key is not configured. Add GEMINI_API_KEY to .env.local to use deep analysis.',
        },
        { status: 503 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Gemini API key is not configured. Add GEMINI_API_KEY to .env.local to use deep analysis.',
        },
        { status: 503 }
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
      profile = await readJsonFile<UserProfile>(
        profileFilePath,
        'user_profile.json'
      )
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }

    const profileVersion =
      profile.profileVersion !== undefined && profile.profileVersion !== null
        ? profile.profileVersion
        : 1

    const prompt = buildGeminiPrompt(job, profile)

    let geminiText: string
    let model: string
    try {
      const geminiResult = await callGemini(prompt, apiKey)
      geminiText = geminiResult.text
      model = geminiResult.model
    } catch (error) {
      console.error('POST /api/jobs/[id]/analyze/deep Gemini call failed:', error)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Gemini deep analysis request failed',
        },
        { status: 502 }
      )
    }

    let parsed: Record<string, unknown>
    try {
      const jsonText = extractJsonFromText(geminiText)
      parsed = JSON.parse(jsonText) as Record<string, unknown>
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Parsed value is not a JSON object')
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Gemini returned invalid JSON for deep analysis',
          details: error instanceof Error ? error.message : String(error),
          preview: sanitizePreview(geminiText),
        },
        { status: 502 }
      )
    }

    const result = normalizeDeepAnalysis(parsed, id, profileVersion, model)
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/jobs/[id]/analyze/deep failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
