import { NextResponse } from 'next/server'
import { analyzeAllJobsLocally } from '@/lib/analysis/analyzeAllJobsLocally'
import { readJobs, updateJob } from '@/lib/jobs/jobsRepository'
import { getActiveProfileFromDb } from '@/lib/profile/profileRepository'

// Batch local rule-based analysis (TASK-030): runs the same profile-driven
// analysis as POST /api/jobs/[id]/analyze over every job in the store, then
// overwrites each job's `localAnalysis`. Local analysis is a pure function of
// (job, profile), so re-running it for all jobs is naturally idempotent.

export async function POST() {
  try {
    const jobs = readJobs()
    const profile = getActiveProfileFromDb()
    const results = analyzeAllJobsLocally(jobs, profile)

    for (const { id, result } of results) {
      // The canonical Job is a superset of LocalAnalyzableJob.
      updateJob(id, { localAnalysis: result as unknown as Record<string, unknown> })
    }

    return NextResponse.json({ analyzed: results.length })
  } catch (error) {
    console.error('POST /api/jobs/analyze-local-all failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
