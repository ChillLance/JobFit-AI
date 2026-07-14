import { NextResponse } from 'next/server'
import { hasGeminiApiKey } from '@/lib/aiConfig'
import { findJob, updateJob, type JobPatch } from '@/lib/jobs/jobsRepository'
import { buildExtractionPrompt } from '@/lib/extraction/buildExtractionPrompt'
import { hashRawText, parseExtraction } from '@/lib/extraction/parseExtraction'
import type { Job } from '@/types/domain'
import type { JobExtraction } from '@/types/extraction'

// rawText → structured field extraction via Gemini (design doc
// docs/JOB_EXTRACTION_DESIGN.md §9). Manual POST; never auto-called.
//
// `Job` (src/types/domain.ts) does not declare an `extraction` field yet —
// deliberately not extending that shared type here (out of scope for this
// change). The local `JobWithExtraction` intersection type below is enough
// to read/write the field through the existing repository API.

const EXTRACTION_MODEL = 'gemini-3.5-flash' // same model id as analyze/deep/route.ts
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const SCHEMA_VERSION = 1

type JobWithExtraction = Job & { extraction?: JobExtraction }

type Params = {
  params: Promise<{
    id: string
  }>
}

function sanitizePreview(text: string, maxLen = 400): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length <= maxLen ? oneLine : `${oneLine.slice(0, maxLen)}…`
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `${GEMINI_API_BASE}/${EXTRACTION_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        // gemini-3.5-flash is a thinking model: thinking tokens count against
        // maxOutputTokens, so 4096 gets exhausted before the JSON is emitted
        // (measured 2026-07-14: finishReason MAX_TOKENS with 306 chars out).
        maxOutputTokens: 32768,
        responseMimeType: 'application/json',
      },
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
    throw new Error(`Gemini API request failed (${response.status}): ${sanitizePreview(detail)}`)
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw new Error('Gemini API returned non-JSON response envelope')
  }

  const candidates = (payload as { candidates?: unknown[] }).candidates
  const first = Array.isArray(candidates) ? candidates[0] : undefined

  const finishReason = (first as { finishReason?: string } | undefined)?.finishReason
  if (finishReason === 'MAX_TOKENS') {
    throw new Error('Gemini output truncated (finishReason MAX_TOKENS) — raise maxOutputTokens')
  }

  const parts = (first as { content?: { parts?: unknown[] } })?.content?.parts
  const textPart = Array.isArray(parts)
    ? parts.find((p) => typeof (p as { text?: string }).text === 'string')
    : undefined
  const text = (textPart as { text?: string } | undefined)?.text?.trim()

  if (!text) {
    throw new Error('Gemini API returned empty content')
  }

  return text
}

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: { code: 'missing_job_id' } }, { status: 400 })
    }

    const job = findJob(id) as JobWithExtraction | undefined

    if (!job) {
      return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })
    }

    const url = new URL(request.url)
    const force = url.searchParams.get('force') === 'true'

    const rawText = job.rawText ?? ''
    const currentHash = hashRawText(rawText)
    const existing = job.extraction

    // Idempotent skip: same rawText + current schema version → return the
    // stored result without calling the LLM (design doc §9), unless forced.
    if (
      !force &&
      existing &&
      existing.rawTextHash === currentHash &&
      existing.schemaVersion === SCHEMA_VERSION
    ) {
      return NextResponse.json({ extraction: existing, demotedFields: [], warnings: [] })
    }

    if (!hasGeminiApiKey()) {
      return NextResponse.json(
        { error: { code: 'missing_api_key', provider: 'gemini' } },
        { status: 503 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { error: { code: 'missing_api_key', provider: 'gemini' } },
        { status: 503 }
      )
    }

    const prompt = buildExtractionPrompt({
      title: job.title ?? '',
      url: job.url ?? '',
      rawText,
    })

    let modelOutput: string
    try {
      modelOutput = await callGemini(prompt, apiKey)
    } catch (error) {
      console.error('POST /api/jobs/[id]/extract Gemini call failed:', error)
      return NextResponse.json(
        {
          error: {
            code: 'provider_error',
            message: error instanceof Error ? error.message : String(error),
          },
        },
        { status: 502 }
      )
    }

    const result = parseExtraction(modelOutput, { rawText, model: EXTRACTION_MODEL })

    if (!result.ok) {
      console.error('POST /api/jobs/[id]/extract parse failed:', result.details)
      return NextResponse.json(
        { error: { code: 'parse_error', details: result.details } },
        { status: 502 }
      )
    }

    updateJob(id, { extraction: result.extraction } as unknown as JobPatch)

    return NextResponse.json({
      extraction: result.extraction,
      demotedFields: result.demotedFields,
      warnings: result.warnings,
    })
  } catch (error) {
    console.error('POST /api/jobs/[id]/extract failed:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    )
  }
}
