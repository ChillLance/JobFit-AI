import { NextResponse } from 'next/server'
import { findJob, updateJob } from '@/lib/jobs/jobsRepository'
import {
  buildAnalysisInput,
  buildJobFitPrompt,
  type CompactAnalysisInput,
  type InputCoverageReport,
} from '@/lib/analysis/compactInput'
import {
  getAiOutputLanguageInstruction,
  resolveAppLanguage,
  type AppLanguage,
} from '@/lib/appLanguage'
import {
  defaultJapanCareerProfile,
  flattenProfileForCompactInput,
  JAPAN_CAREER_PROFILE_VERSION,
  profileToAnalysisContext,
  type JapanCareerProfile,
} from '@/lib/profile'

// Server-side OpenRouter deep analysis — manual POST; never auto-called.
// OpenRouter is an OpenAI-compatible gateway to many models; the model is
// selected via OPENROUTER_MODEL. Result is persisted on the job as
// `openrouterAnalysis` and must never overwrite deepAnalysis / groqAnalysis.
//
// Requires OPENROUTER_API_KEY in .env.local (left blank until the developer
// adds one — the route responds 503 with a clear message until then).

const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

type Params = {
  params: Promise<{ id: string }>
}

type RecommendedAction = 'apply' | 'maybe' | 'skip'

type OpenRouterAnalysisResponse = {
  jobId: string
  analysisType: 'openrouter-deep'
  analysisVersion: 'openrouter-v1'
  fitScore: number
  recommendation: string
  recommendedAction: RecommendedAction
  summary: string
  strengths: string[]
  gaps: string[]
  risks: string[]
  suggestedActions: string[]
  metadata: {
    source: 'openrouter'
    provider: 'openrouter'
    model: string
    profileVersion: string
    createdAt: string
    cacheExpiresAt: string
    inputMode: 'digest'
    tokenStrategy: 'relevant_job_digest_v1'
    analyzedProfileId?: string
    analyzedProfileName?: string
    analyzedAt?: string
    inputCoverage: InputCoverageReport
    outputLanguage?: AppLanguage
  }
}

function isValidProfile(value: unknown): value is JapanCareerProfile {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    p.version === JAPAN_CAREER_PROFILE_VERSION &&
    typeof p.name === 'string' &&
    typeof p.target === 'object' &&
    p.target !== null &&
    typeof p.conditions === 'object' &&
    p.conditions !== null
  )
}

function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL
}

function clampScore(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function normalizeRecommendedAction(value: unknown): RecommendedAction {
  if (value === 'apply' || value === 'maybe' || value === 'skip') return value
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
  return oneLine.length <= maxLen ? oneLine : `${oneLine.slice(0, maxLen)}…`
}

// Extract the largest JSON object from possibly-noisy model output.
function extractJsonFromText(text: string): string {
  let trimmed = text.trim().replace(/^\uFEFF/, '').trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch?.[1]) trimmed = fenceMatch[1].trim()

  const firstBrace = trimmed.indexOf('{')
  if (firstBrace < 0) return trimmed

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = firstBrace; i < trimmed.length; i += 1) {
    const ch = trimmed[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return trimmed.slice(firstBrace, i + 1).trim()
    }
  }

  const lastBrace = trimmed.lastIndexOf('}')
  return lastBrace > firstBrace
    ? trimmed.slice(firstBrace, lastBrace + 1).trim()
    : trimmed
}

function parseModelJson(text: string): Record<string, unknown> {
  const jsonText = extractJsonFromText(text)
  try {
    const parsed = JSON.parse(jsonText) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Parsed value is not a JSON object')
    }
    return parsed as Record<string, unknown>
  } catch (firstError) {
    const repaired = jsonText
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    try {
      const parsed = JSON.parse(repaired) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Parsed repaired value is not a JSON object')
      }
      return parsed as Record<string, unknown>
    } catch (secondError) {
      const m1 = firstError instanceof Error ? firstError.message : String(firstError)
      const m2 = secondError instanceof Error ? secondError.message : String(secondError)
      throw new Error(
        `Unable to parse OpenRouter JSON. First parse error: ${m1}; repaired parse error: ${m2}`
      )
    }
  }
}

function isCacheValid(
  cached: OpenRouterAnalysisResponse | undefined,
  model: string,
  profileVersion: string,
  language: AppLanguage
): boolean {
  const meta = cached?.metadata
  if (!meta) return false
  if (meta.model !== model) return false
  if (String(meta.profileVersion) !== profileVersion) return false
  if (meta.inputMode !== 'digest') return false
  if ((meta.outputLanguage ?? 'zh-TW') !== language) return false

  const now = Date.now()
  if (meta.cacheExpiresAt) {
    const expires = new Date(meta.cacheExpiresAt).getTime()
    return Number.isFinite(expires) && now < expires
  }
  if (meta.createdAt) {
    const created = new Date(meta.createdAt).getTime()
    return Number.isFinite(created) && now < created + CACHE_TTL_MS
  }
  return false
}

function recommendationLabel(action: RecommendedAction): string {
  switch (action) {
    case 'apply':
      return '建議投遞'
    case 'skip':
      return '暫不建議'
    default:
      return '可以考慮'
  }
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model: string
): Promise<{ text: string }> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      // OpenRouter attribution headers (optional but recommended).
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'JobFit-AI',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  const rawBody = await response.text()

  if (!response.ok) {
    let detail = rawBody
    try {
      const errJson = JSON.parse(rawBody) as { error?: { message?: string } }
      detail = errJson.error?.message || rawBody
    } catch {
      // keep rawBody
    }
    throw new Error(
      `OpenRouter API request failed (${response.status}): ${sanitizePreview(detail, 400)}`
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw new Error('OpenRouter API returned non-JSON response envelope')
  }

  const choices = (payload as { choices?: unknown[] }).choices
  const first = Array.isArray(choices) ? choices[0] : undefined
  const content = (first as { message?: { content?: unknown } })?.message?.content
  const text = typeof content === 'string' ? content.trim() : ''
  if (!text) throw new Error('OpenRouter API returned empty content')
  return { text }
}

function normalizeResult(
  parsed: Record<string, unknown>,
  jobId: string,
  model: string,
  analysisInput: CompactAnalysisInput,
  profile: JapanCareerProfile,
  language: AppLanguage
): OpenRouterAnalysisResponse {
  const createdAtDate = new Date()
  const createdAt = createdAtDate.toISOString()
  const cacheExpiresAt = new Date(createdAtDate.getTime() + CACHE_TTL_MS).toISOString()

  const recommendedAction = normalizeRecommendedAction(
    parsed.recommendedAction ?? parsed.recommendation
  )
  const recommendation =
    typeof parsed.recommendation === 'string' && parsed.recommendation.trim()
      ? parsed.recommendation.trim()
      : recommendationLabel(recommendedAction)

  const risks = toStringArray(parsed.risks).length
    ? toStringArray(parsed.risks)
    : toStringArray(parsed.riskFactors)

  const suggestedActions = toStringArray(parsed.suggestedActions).length
    ? toStringArray(parsed.suggestedActions)
    : [
        ...toStringArray(parsed.resumeAdvice),
        ...toStringArray(parsed.interviewPrep),
        ...toStringArray(parsed.questionsToAskEmployer),
      ].slice(0, 12)

  return {
    jobId: typeof parsed.jobId === 'string' ? parsed.jobId : jobId,
    analysisType: 'openrouter-deep',
    analysisVersion: 'openrouter-v1',
    fitScore: clampScore(Number(parsed.fitScore)),
    recommendation,
    recommendedAction,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    strengths: toStringArray(parsed.strengths),
    gaps: toStringArray(parsed.gaps),
    risks,
    suggestedActions,
    metadata: {
      source: 'openrouter',
      provider: 'openrouter',
      model,
      profileVersion: `${profile.id}@${profile.updatedAt}`,
      createdAt,
      cacheExpiresAt,
      inputMode: 'digest',
      tokenStrategy: 'relevant_job_digest_v1',
      analyzedProfileId: profile.id,
      analyzedProfileName: profile.name,
      analyzedAt: createdAt,
      inputCoverage: analysisInput.inputCoverage,
      outputLanguage: language,
    },
  }
}

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    // Optional { force, profile, language } body — same contract as deep/groq.
    let force = false
    let profile: JapanCareerProfile = defaultJapanCareerProfile
    let language: AppLanguage = resolveAppLanguage(undefined)
    try {
      const body = (await request.json()) as {
        force?: unknown
        profile?: unknown
        language?: unknown
      } | null
      if (body && typeof body === 'object') {
        if (body.force === true) force = true
        if (isValidProfile(body.profile)) profile = body.profile
        language = resolveAppLanguage(body.language)
      }
    } catch {
      force = false
    }

    const job = findJob(id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found', jobId: id }, { status: 404 })
    }

    const cached = job.openrouterAnalysis as OpenRouterAnalysisResponse | undefined
    const model = getOpenRouterModel()
    const profileVersion = `${profile.id}@${profile.updatedAt}`

    if (force !== true && isCacheValid(cached, model, profileVersion, language)) {
      return NextResponse.json({ ok: true, source: 'cache', analysis: cached })
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'OpenRouter API key is not configured. Add OPENROUTER_API_KEY to .env.local to use OpenRouter analysis.',
        },
        { status: 503 }
      )
    }

    // Same shared compact digest input as Gemini / Groq (TASK-021).
    const analysisInput = buildAnalysisInput(
      job,
      flattenProfileForCompactInput(profile)
    )
    const systemPrompt = `You are a career advisor familiar with the Japanese job market. Output only a single valid JSON object. No markdown, code fences, or extra text. ${getAiOutputLanguageInstruction(language)}`
    const userPrompt = buildJobFitPrompt(analysisInput, {
      profileContext: profileToAnalysisContext(profile),
      language,
    })

    let text: string
    try {
      ;({ text } = await callOpenRouter(systemPrompt, userPrompt, apiKey, model))
    } catch (error) {
      console.error('POST /api/jobs/[id]/analyze/openrouter call failed:', error)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'OpenRouter analysis request failed',
        },
        { status: 502 }
      )
    }

    let parsed: Record<string, unknown>
    try {
      parsed = parseModelJson(text)
    } catch (error) {
      console.error('OpenRouter returned invalid JSON:', error)
      return NextResponse.json(
        {
          error: 'OpenRouter returned invalid JSON for analysis',
          details: error instanceof Error ? error.message : String(error),
          preview: sanitizePreview(text, 1200),
        },
        { status: 502 }
      )
    }

    const result = normalizeResult(parsed, id, model, analysisInput, profile, language)

    // Persist as `openrouterAnalysis` only — never touch other providers' keys.
    try {
      updateJob(id, {
        openrouterAnalysis: result as unknown as Record<string, unknown>,
      })
    } catch (error) {
      console.error('Failed to persist OpenRouter analysis result:', error)
      return NextResponse.json(
        {
          error: 'OpenRouter analysis succeeded, but failed to save result',
          details: error instanceof Error ? error.message : String(error),
          result,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, source: 'fresh', analysis: result })
  } catch (error) {
    console.error('POST /api/jobs/[id]/analyze/openrouter failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
