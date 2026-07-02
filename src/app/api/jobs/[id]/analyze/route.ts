import { NextResponse } from 'next/server'
import { analyzeJobLocally } from '@/lib/analysis/localAnalysis'
import { findJob, updateJob } from '@/lib/jobs/jobsRepository'
import { resolveAppLanguage, type AppLanguage } from '@/lib/appLanguage'
import { getActiveProfileFromDb } from '@/lib/profile/profileRepository'

// Profile-driven local rule-based analysis (TASK-029).
// The active JapanCareerProfile is resolved server-side from the mirrored
// profile store (redesign Phase 2) instead of the request body — see
// src/lib/profile/profileRepository.ts.

type Params = {
  params: Promise<{
    id: string
  }>
}

async function parseAnalyzeRequest(
  request: Request
): Promise<{ language: AppLanguage }> {
  let language = resolveAppLanguage(undefined)
  try {
    const body = (await request.json()) as { language?: unknown } | null
    if (body && typeof body === 'object') {
      language = resolveAppLanguage(body.language)
    }
  } catch {
    // No / invalid body — fall back to the default language above.
  }
  return { language }
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

    const { language } = await parseAnalyzeRequest(request)
    // Parsed for upcoming AI output language (TASK-2D); local analysis unchanged.
    void language
    const profile = getActiveProfileFromDb()
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
