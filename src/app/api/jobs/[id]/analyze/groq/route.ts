import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import {
  buildAnalysisInput,
  buildJobFitPrompt,
  MAX_JOB_TEXT_CHARS,
  type CompactAnalysisInput,
  type InputCoverageReport,
  type JobDigest,
} from '@/lib/analysis/compactInput'
import {
  defaultJapanCareerProfile,
  flattenProfileForCompactInput,
  JAPAN_CAREER_PROFILE_VERSION,
  profileToAnalysisContext,
  type JapanCareerProfile,
} from '@/lib/profile'

// Server-side Groq Llama 70B deep analysis only — manual POST; never auto-called.
// Uses Groq's OpenAI-compatible chat completions endpoint.
// Result is persisted on the job as `groqAnalysis` and must never overwrite `deepAnalysis` (Gemini).

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// groqAnalysis cache TTL. Cached Groq results are reused for this long.
const CACHE_TTL_DAYS = 7
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000

type Params = {
  params: Promise<{
    id: string
  }>
}

type RecommendedAction = 'apply' | 'maybe' | 'skip'

type GroqAnalysisResponse = {
  jobId: string
  analysisType: 'groq-deep'
  analysisVersion: 'groq-v1'
  fitScore: number
  recommendation: string
  // Legacy alias kept for backward compatibility with older readers.
  recommendedAction: RecommendedAction
  summary: string
  strengths: string[]
  gaps: string[]
  risks: string[]
  suggestedActions: string[]
  metadata: {
    source: 'groq'
    provider: 'groq'
    model: string
    profileVersion: string
    createdAt: string
    cacheExpiresAt: string
    inputMode: 'digest'
    tokenStrategy: 'relevant_job_digest_v1'
    // Active JapanCareerProfile used as the analysis baseline (TASK-029).
    analyzedProfileId?: string
    analyzedProfileName?: string
    analyzedAt?: string
    // Input stats + coverage diagnostics. Counts / keyword-type-source flags
    // only; never the full job text, cleaned text, or full evidence text.
    inputStats: InputStats
    inputCoverage: InputCoverageReport
  }
}

// Evidence reference kept in metadata: keyword/type/source only (no full text).
type EvidenceKeywordRef = {
  keyword: string
  type: string
  source: string
}

type InputStats = {
  inputStrategy: 'relevant_job_digest_v1'
  maxTextChars: number
  cleanedTextChars: number
  wasTruncated: boolean
  localScore: number | null
  matchedKeywords: string[]
  riskKeywords: string[]
  digestStats: JobDigest['digestStats']
  evidenceSnippetCount: number
  tailEvidenceSnippetCount: number
  evidenceKeywords: EvidenceKeywordRef[]
  fallbackItemCount: number
  fallbackTextChars: number
}

// Build digest input stats from the shared analysis input. Stores only counts
// and evidence keyword/type/source — never raw text or full evidence text.
function buildInputStats(input: CompactAnalysisInput): InputStats {
  const ds = input.jobDigest.digestStats
  return {
    inputStrategy: 'relevant_job_digest_v1',
    maxTextChars: MAX_JOB_TEXT_CHARS,
    cleanedTextChars: input.inputCoverage.cleanedFullLength,
    wasTruncated: input.inputCoverage.wasTruncated,
    localScore: input.localSignals.localScore ?? null,
    matchedKeywords: input.localSignals.matchedKeywords,
    riskKeywords: input.localSignals.riskKeywords,
    digestStats: ds,
    evidenceSnippetCount: ds.evidenceSnippetCount,
    tailEvidenceSnippetCount: ds.tailEvidenceSnippetCount,
    evidenceKeywords: input.jobDigest.evidenceSnippets.map((s) => ({
      keyword: s.keyword,
      type: s.type,
      source: s.source,
    })),
    fallbackItemCount: ds.fallbackItemCount,
    fallbackTextChars: ds.fallbackTextChars,
  }
}

type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  description?: string
  source?: string
  collectedAt?: string
  company?: string
  location?: string
  salary?: string
  employmentType?: string
  deepAnalysis?: unknown
  groqAnalysis?: GroqAnalysisResponse
  [key: string]: unknown
}

const jobsFilePath = path.join(process.cwd(), 'jobs_temp.json')

// Defensive shape check: require the fields the analysis baseline relies on.
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

function getGroqModel(): string {
  const model = process.env.GROQ_MODEL?.trim()
  return model || DEFAULT_GROQ_MODEL
}

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

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
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
  let trimmed = text.trim()

  trimmed = trimmed.replace(/^\uFEFF/, '').trim()

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch?.[1]) {
    trimmed = fenceMatch[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  if (firstBrace < 0) return trimmed

  let depth = 0
  let inString = false
  let escaped = false
  let end = -1

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

    if (ch === '{') {
      depth += 1
    } else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end >= firstBrace) {
    return trimmed.slice(firstBrace, end + 1).trim()
  }

  const lastBrace = trimmed.lastIndexOf('}')
  if (lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim()
  }

  return trimmed
}

function parseGroqJson(text: string): Record<string, unknown> {
  const jsonText = extractJsonFromText(text)

  try {
    const parsed = JSON.parse(jsonText) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Parsed value is not a JSON object')
    }

    return parsed as Record<string, unknown>
  } catch (firstError) {
    const repaired = jsonText
      .replace(/^\uFEFF/, '')
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
      const firstMessage =
        firstError instanceof Error ? firstError.message : String(firstError)
      const secondMessage =
        secondError instanceof Error ? secondError.message : String(secondError)

      throw new Error(
        `Unable to parse Groq JSON. First parse error: ${firstMessage}; repaired parse error: ${secondMessage}`
      )
    }
  }
}

// Decide whether an existing groqAnalysis can be served from cache.
function isGroqCacheValid(
  groqAnalysis: GroqAnalysisResponse | undefined,
  model: string,
  profileVersion: string
): boolean {
  const meta = groqAnalysis?.metadata
  if (!meta) return false
  if (meta.model !== model) return false
  if (String(meta.profileVersion) !== profileVersion) return false

  // TASK-021.3: only the relevant-job-digest input strategy counts as a valid
  // cache. Older compact_job_input_v1 results are treated as stale.
  const strategyMeta = meta as unknown as {
    inputMode?: unknown
    tokenStrategy?: unknown
  }
  if (strategyMeta.inputMode !== 'digest') return false
  if (strategyMeta.tokenStrategy !== 'relevant_job_digest_v1') return false

  const now = Date.now()

  if (meta.cacheExpiresAt) {
    const expires = new Date(meta.cacheExpiresAt).getTime()
    if (Number.isNaN(expires)) return false
    return now < expires
  }

  if (meta.createdAt) {
    const created = new Date(meta.createdAt).getTime()
    if (Number.isNaN(created)) return false
    return now < created + CACHE_TTL_MS
  }

  return false
}

function buildSystemPrompt(): string {
  return `你是一位熟悉日本就職市場的職涯顧問。你只會輸出單一合法的 JSON 物件，不會輸出 markdown、程式碼區塊或任何額外文字。所有面向使用者的文字欄位必須使用繁體中文。`
}

// Derive a short Traditional Chinese recommendation when the model omits one.
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

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model: string
): Promise<{ text: string }> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
      const errJson = JSON.parse(rawBody) as {
        error?: { message?: string }
      }
      detail = errJson.error?.message || rawBody
    } catch {
      // keep rawBody
    }
    throw new Error(
      `Groq API request failed (${response.status}): ${sanitizePreview(detail, 400)}`
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw new Error('Groq API returned non-JSON response envelope')
  }

  const choices = (payload as { choices?: unknown[] }).choices
  const first = Array.isArray(choices) ? choices[0] : undefined
  const content = (first as { message?: { content?: unknown } })?.message
    ?.content
  const text = typeof content === 'string' ? content.trim() : ''

  if (!text) {
    throw new Error('Groq API returned empty content')
  }

  return { text }
}

function normalizeGroqAnalysis(
  parsed: Record<string, unknown>,
  jobId: string,
  model: string,
  analysisInput: CompactAnalysisInput,
  profile: JapanCareerProfile
): GroqAnalysisResponse {
  const createdAtDate = new Date()
  const createdAt = createdAtDate.toISOString()
  const cacheExpiresAt = new Date(
    createdAtDate.getTime() + CACHE_TTL_MS
  ).toISOString()

  // Unified compact schema: recommendation / risks / suggestedActions.
  // Fall back to the legacy field names if an older response shape arrives.
  const recommendedAction = normalizeRecommendedAction(
    parsed.recommendedAction ?? parsed.recommendation
  )
  const recommendation =
    typeof parsed.recommendation === 'string' && parsed.recommendation.trim()
      ? parsed.recommendation.trim()
      : recommendationLabel(recommendedAction)

  const risksFromUnified = toStringArray(parsed.risks)
  const risks = risksFromUnified.length
    ? risksFromUnified
    : toStringArray(parsed.riskFactors)

  const actionsFromUnified = toStringArray(parsed.suggestedActions)
  const suggestedActions = actionsFromUnified.length
    ? actionsFromUnified
    : [
        ...toStringArray(parsed.resumeAdvice),
        ...toStringArray(parsed.interviewPrep),
        ...toStringArray(parsed.questionsToAskEmployer),
      ].slice(0, 12)

  return {
    jobId: typeof parsed.jobId === 'string' ? parsed.jobId : jobId,
    analysisType: 'groq-deep',
    analysisVersion: 'groq-v1',
    fitScore: clampScore(Number(parsed.fitScore)),
    recommendation,
    recommendedAction,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    strengths: toStringArray(parsed.strengths),
    gaps: toStringArray(parsed.gaps),
    risks,
    suggestedActions,
    metadata: {
      source: 'groq',
      provider: 'groq',
      model,
      profileVersion: `${profile.id}@${profile.updatedAt}`,
      createdAt,
      cacheExpiresAt,
      inputMode: 'digest',
      tokenStrategy: 'relevant_job_digest_v1',
      analyzedProfileId: profile.id,
      analyzedProfileName: profile.name,
      analyzedAt: createdAt,
      inputStats: buildInputStats(analysisInput),
      inputCoverage: analysisInput.inputCoverage,
    },
  }
}

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    // Parse optional { force, profile } body. Missing/invalid body means
    // force=false and the default profile baseline.
    let force = false
    let profile: JapanCareerProfile = defaultJapanCareerProfile
    try {
      const body = (await request.json()) as {
        force?: unknown
        profile?: unknown
      } | null
      if (body && typeof body === 'object') {
        if (body.force === true) force = true
        if (isValidProfile(body.profile)) profile = body.profile
      }
    } catch {
      force = false
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

    const model = getGroqModel()

    // Profile version is derived from the active profile so the cache is
    // invalidated whenever the user switches or edits their profile (TASK-029).
    const profileVersion = `${profile.id}@${profile.updatedAt}`

    // Serve cached groqAnalysis when valid and not force-refreshed.
    if (
      force !== true &&
      isGroqCacheValid(job.groqAnalysis, model, profileVersion)
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          source: 'cache',
          analysis: job.groqAnalysis,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
    }

    const apiKey = process.env.GROQ_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Groq API key is not configured. Add GROQ_API_KEY to .env.local to use Groq Llama 70B analysis.',
        },
        { status: 503 }
      )
    }

    // Shared compact input so Gemini and Groq analyze the same data (TASK-021).
    // The active profile (TASK-029) is flattened for the compact pipeline and
    // its full context becomes the prompt's primary decision baseline.
    const analysisInput = buildAnalysisInput(
      job,
      flattenProfileForCompactInput(profile)
    )

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildJobFitPrompt(analysisInput, {
      profileContext: profileToAnalysisContext(profile),
    })

    let groqText: string
    try {
      const groqResult = await callGroq(systemPrompt, userPrompt, apiKey, model)
      groqText = groqResult.text
    } catch (error) {
      console.error('POST /api/jobs/[id]/analyze/groq Groq call failed:', error)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Groq deep analysis request failed',
        },
        { status: 502 }
      )
    }

    let parsed: Record<string, unknown>
    try {
      parsed = parseGroqJson(groqText)
    } catch (error) {
      console.error('Groq returned invalid JSON for deep analysis')
      console.error('Parse error:', error)
      console.error('Groq raw text preview:', sanitizePreview(groqText, 1200))

      return new Response(
        JSON.stringify({
          error: 'Groq returned invalid JSON for deep analysis',
          details: error instanceof Error ? error.message : String(error),
          preview: sanitizePreview(groqText, 1200),
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
    }

    const result = normalizeGroqAnalysis(parsed, id, model, analysisInput, profile)

    // Persist as `groqAnalysis` only — never touch `deepAnalysis` (Gemini).
    const updatedJobs = jobs.map((j) => {
      if (j.id !== id) return j

      return {
        ...j,
        groqAnalysis: result,
      }
    })

    try {
      await writeJsonFile(jobsFilePath, updatedJobs)
    } catch (error) {
      console.error('Failed to persist Groq deep analysis result:', error)

      return new Response(
        JSON.stringify({
          error: 'Groq analysis succeeded, but failed to save result',
          details: error instanceof Error ? error.message : String(error),
          result,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
    }

    return new Response(
      JSON.stringify({
        ok: true,
        source: 'fresh',
        analysis: result,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('POST /api/jobs/[id]/analyze/groq failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
