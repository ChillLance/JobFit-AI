import { NextResponse } from 'next/server'
import { analyzeJobLocally } from '@/lib/analysis/localAnalysis'
import { findJob, updateJob } from '@/lib/jobs/jobsRepository'
import { resolveAppLanguage, type AppLanguage } from '@/lib/appLanguage'
import {
  defaultJapanCareerProfile,
  JAPAN_CAREER_PROFILE_VERSION,
  type JapanCareerProfile,
} from '@/lib/profile'

// Profile-driven local rule-based analysis (TASK-029).
// The active JapanCareerProfile is sent by the client in the request body and
// used as the decision baseline. If no valid profile is provided we fall back
// to the default profile so existing behavior never crashes.

type Params = {
  params: Promise<{
    id: string
  }>
}

// Defensive shape check: require the fields the analyzer relies on. Anything
// else means we treat the input as missing and fall back to the default.
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
    p.conditions !== null &&
    typeof p.preferences === 'object' &&
    p.preferences !== null &&
    typeof p.languages === 'object' &&
    p.languages !== null &&
    typeof p.visa === 'object' &&
    p.visa !== null
  )
}

async function parseAnalyzeRequest(request: Request): Promise<{
  profile: JapanCareerProfile
  language: AppLanguage
}> {
  let profile = defaultJapanCareerProfile
  let language = resolveAppLanguage(undefined)
  try {
    const body = (await request.json()) as {
      profile?: unknown
      language?: unknown
    } | null
    if (body && typeof body === 'object') {
      if (isValidProfile(body.profile)) profile = body.profile
      language = resolveAppLanguage(body.language)
    }
  } catch {
    // No / invalid body — fall back to defaults above.
  }
  return { profile, language }
}

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    const job = findJob(id)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', jobId: id },
        { status: 404 }
      )
    }

    const { profile, language } = await parseAnalyzeRequest(request)
    // Parsed for upcoming AI output language (TASK-2D); local analysis unchanged.
    void language
    // The canonical Job is a superset of LocalAnalyzableJob.
    const result = analyzeJobLocally(job, profile)

    // Persist under the canonical `localAnalysis` key (redesign Phase 1).
    updateJob(id, { localAnalysis: result as unknown as Record<string, unknown> })

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
