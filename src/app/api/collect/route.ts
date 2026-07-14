import { NextResponse } from 'next/server'
import { prependJob, readJobs, updateJob, type JobPatch } from '@/lib/jobs/jobsRepository'
import { hashRawText } from '@/lib/extraction/parseExtraction'
import { normalizeJobUrl } from '@/lib/jobs/normalizeJobUrl'
import type { Job } from '@/types/domain'
import type { JobExtraction } from '@/types/extraction'

// `Job` (src/types/domain.ts) does not declare an `extraction` field —
// deliberately not extending that shared type here (out of scope for this
// change). This local intersection is enough to read/clear it through the
// existing repository API.
type JobWithExtraction = Job & { extraction?: JobExtraction }
type PatchWithExtraction = JobPatch & { extraction?: JobExtraction }

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const url: string = body.url || ''
    const title: string = body.title || 'Untitled'
    const rawText: string = body.rawText || ''
    const collectedAt = new Date().toISOString()

    // Upsert-by-URL for non-demo jobs (design doc §9 / §1: fixes the
    // duplicate-URL bug the extension previously caused). Demo jobs
    // (source === 'demo') are never matched or written by this endpoint.
    // Compared via normalizeJobUrl rather than raw string equality: Indeed
    // appends per-visit session tracking params (tk/adid/xkcb/…) that change
    // every collection, so a raw comparison would never match the same job
    // twice and would keep inserting duplicates.
    const normalizedUrl = normalizeJobUrl(url)
    const existing = url
      ? readJobs().find(
          (job) => normalizeJobUrl(job.url ?? '') === normalizedUrl && job.source !== 'demo'
        )
      : undefined

    if (existing) {
      const patch: PatchWithExtraction = { title, rawText, collectedAt }

      const existingExtraction = (existing as JobWithExtraction).extraction
      if (existingExtraction && existingExtraction.rawTextHash !== hashRawText(rawText)) {
        // rawText changed — the stored extraction no longer matches; clear
        // it so the next POST /api/jobs/[id]/extract call re-runs instead of
        // silently serving a stale result.
        patch.extraction = undefined
      }

      const updated = updateJob(existing.id, patch)

      return NextResponse.json({
        success: true,
        job: updated,
      })
    }

    const newJob: Job = {
      id: crypto.randomUUID(),
      title,
      url,
      rawText,
      collectedAt,
    }

    prependJob(newJob)

    return NextResponse.json({
      success: true,
      job: newJob,
    })
  } catch (error) {
    console.error('Collect API Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}
