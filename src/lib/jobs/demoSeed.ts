/**
 * DEMO_MODE seed data (see docs/DEPLOYMENT.md §6 and §11).
 *
 * Builds the fixed set of demo jobs (data/demo-jobs.json) with a local
 * analysis pass already applied, so a public demo deployment shows scored
 * cards immediately without requiring the visitor to click "Analyze all".
 * Local analysis is a pure function of (job, profile) — see
 * analyzeAllJobsLocally.ts — so running it once at repository-construction
 * time is equivalent to the user clicking the button themselves.
 *
 * Pure module: no fs, no network, no node:sqlite. Safe to import
 * unconditionally from jobsRepository.ts (unlike db.ts).
 */
import demoJobsRaw from '../../../data/demo-jobs.json'
import type { Job } from '@/types/domain'
import { defaultJapanCareerProfile } from '@/lib/profile/defaultProfile'
import { analyzeAllJobsLocally } from '@/lib/analysis/analyzeAllJobsLocally'

/** Fresh copies of the demo jobs, each carrying a `localAnalysis` result. */
export function buildDemoJobs(): Job[] {
  // demo-jobs.json entries carry an optional `extraction` field that isn't
  // part of the (deliberately narrower) `Job` type in src/types/domain.ts —
  // same loose-cast pattern already used by the extract API route.
  const jobs = JSON.parse(JSON.stringify(demoJobsRaw)) as Job[]
  const results = analyzeAllJobsLocally(jobs, defaultJapanCareerProfile)
  const resultById = new Map(results.map((entry) => [entry.id, entry.result]))

  return jobs.map((job) => {
    const result = resultById.get(job.id)
    if (!result) return job
    return {
      ...job,
      localAnalysis: result as unknown as Record<string, unknown>,
    }
  })
}
