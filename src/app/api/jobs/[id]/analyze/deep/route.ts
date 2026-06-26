import { NextResponse } from 'next/server'
import { hasGeminiApiKey } from '@/lib/aiConfig'
import { findJob, updateJob } from '@/lib/jobs/jobsRepository'
import {
  buildAnalysisInput,
  buildJobFitPrompt,
  MAX_JOB_TEXT_CHARS,
  type CompactAnalysisInput,
  type InputCoverageReport,
  type JobDigest,
} from '@/lib/analysis/compactInput'
import { resolveAppLanguage, type AppLanguage } from '@/lib/appLanguage'
import {
  defaultJapanCareerProfile,
  flattenProfileForCompactInput,
  JAPAN_CAREER_PROFILE_VERSION,
  profileToAnalysisContext,
  type JapanCareerProfile,
} from '@/lib/profile'

// Server-side Gemini deep analysis only — manual POST; never auto-called.

const GEMINI_MODEL = 'gemini-3.5-flash'
const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models'

// deepAnalysis cache TTL (TASK-016). Cached Gemini results are reused for this long.
const CACHE_TTL_DAYS = 7
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000

type Params = {
  params: Promise<{
    id: string
  }>
}

type RecommendedAction = 'apply' | 'maybe' | 'skip'

type DeepAnalysisResponse = {
  jobId: string
  analysisType: 'gemini-deep'
  analysisVersion: 'gemini-v1'
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
    source: 'gemini'
    model: string
    profileVersion: string | number
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
    outputLanguage?: AppLanguage
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

function clampScore(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

// TASK-016: decide whether an existing deepAnalysis can be served from cache.
function isDeepCacheValid(
  deepAnalysis: DeepAnalysisResponse | undefined,
  profileVersion: string | number,
  language: AppLanguage
): boolean {
  const meta = deepAnalysis?.metadata as
    | (DeepAnalysisResponse['metadata'] & { cacheExpiresAt?: string })
    | undefined

  if (!meta) return false
  if (meta.model !== GEMINI_MODEL) return false
  if (String(meta.profileVersion) !== String(profileVersion)) return false

  // TASK-021.3: only the relevant-job-digest input strategy counts as a valid
  // cache. Older compact_job_input_v1 results are treated as stale.
  const strategyMeta = meta as unknown as {
    inputMode?: unknown
    tokenStrategy?: unknown
  }
  if (strategyMeta.inputMode !== 'digest') return false
  if (strategyMeta.tokenStrategy !== 'relevant_job_digest_v1') return false

  const cachedLanguage = meta.outputLanguage ?? 'zh-TW'
  if (cachedLanguage !== language) return false

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

  // Remove BOM if present
  trimmed = trimmed.replace(/^\uFEFF/, '').trim()

  // Remove markdown fences if Gemini ignored the instruction
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch?.[1]) {
    trimmed = fenceMatch[1].trim()
  }

  // If response contains extra text, extract the largest JSON object by brace matching.
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

  // Fallback to simple last brace extraction
  const lastBrace = trimmed.lastIndexOf('}')
  if (lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim()
  }

  return trimmed
}

function parseGeminiJson(text: string): Record<string, unknown> {
  const jsonText = extractJsonFromText(text)

  try {
    const parsed = JSON.parse(jsonText) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Parsed value is not a JSON object')
    }

    return parsed as Record<string, unknown>
  } catch (firstError) {
    // Common cleanup for slightly invalid model output
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
      const firstMessage =
        firstError instanceof Error ? firstError.message : String(firstError)
      const secondMessage =
        secondError instanceof Error ? secondError.message : String(secondError)

      throw new Error(
        `Unable to parse Gemini JSON. First parse error: ${firstMessage}; repaired parse error: ${secondMessage}`
      )
    }
  }
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
        temperature: 0.1,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 4096,
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
  model: string,
  analysisInput: CompactAnalysisInput,
  profile: JapanCareerProfile,
  language: AppLanguage
): DeepAnalysisResponse {
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
    analysisType: 'gemini-deep',
    analysisVersion: 'gemini-v1',
    fitScore: clampScore(Number(parsed.fitScore)),
    recommendation,
    recommendedAction,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    strengths: toStringArray(parsed.strengths),
    gaps: toStringArray(parsed.gaps),
    risks,
    suggestedActions,
    metadata: {
      source: 'gemini',
      model,
      profileVersion,
      createdAt,
      cacheExpiresAt,
      inputMode: 'digest',
      tokenStrategy: 'relevant_job_digest_v1',
      analyzedProfileId: profile.id,
      analyzedProfileName: profile.name,
      analyzedAt: createdAt,
      inputStats: buildInputStats(analysisInput),
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

    // Parse optional { force, profile, language } body. Missing/invalid body
    // means force=false, default profile baseline, and DEFAULT_APP_LANGUAGE.
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
      return NextResponse.json(
        { error: 'Job not found', jobId: id },
        { status: 404 }
      )
    }

    const cachedDeep = job.deepAnalysis as DeepAnalysisResponse | undefined

    // Profile version is derived from the active profile so the cache is
    // invalidated whenever the user switches or edits their profile (TASK-029).
    const profileVersion = `${profile.id}@${profile.updatedAt}`

    // TASK-016: serve cached deepAnalysis when valid and not force-refreshed.
    if (
      force !== true &&
      isDeepCacheValid(cachedDeep, profileVersion, language)
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          source: 'cache',
          analysis: job.deepAnalysis,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
    }

    // Fresh analysis requires a Gemini API key.
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

    // Shared compact input so Gemini and Groq analyze the same data (TASK-021).
    // The active profile (TASK-029) is flattened for the compact pipeline and
    // its full context becomes the prompt's primary decision baseline.
    const analysisInput = buildAnalysisInput(
      job,
      flattenProfileForCompactInput(profile)
    )
    const prompt = buildJobFitPrompt(analysisInput, {
      profileContext: profileToAnalysisContext(profile),
      language,
    })

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
      parsed = parseGeminiJson(geminiText)
    } catch (error) {
      console.error('Gemini returned invalid JSON for deep analysis')
      console.error('Parse error:', error)
      console.error('Gemini raw text preview:', sanitizePreview(geminiText, 1200))

      return new Response(
        JSON.stringify({
          error: 'Gemini returned invalid JSON for deep analysis',
          details: error instanceof Error ? error.message : String(error),
          preview: sanitizePreview(geminiText, 1200),
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
    }

    const result = normalizeDeepAnalysis(
      parsed,
      id,
      profileVersion,
      model,
      analysisInput,
      profile,
      language
    )

    try {
      updateJob(id, {
        deepAnalysis: result as unknown as Record<string, unknown>,
      })
    } catch (error) {
      console.error('Failed to persist deep analysis result:', error)

      return new Response(
        JSON.stringify({
          error: 'Gemini analysis succeeded, but failed to save result',
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
    console.error('POST /api/jobs/[id]/analyze/deep failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
