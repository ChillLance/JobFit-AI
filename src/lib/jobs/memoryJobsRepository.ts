/**
 * In-memory JobsRepository for DEMO_MODE (see docs/DEPLOYMENT.md §6).
 *
 * Mirrors createJobsRepository's SQLite semantics (newest-first ordering,
 * same JobPatch merge behavior) but keeps everything in a module-level array
 * instead of `data/jobfit.sqlite`. This module never imports `node:sqlite` —
 * that's the point: some serverless Node runtimes (e.g. Vercel's Node 20/22)
 * don't ship it, so the DEMO_MODE path must stay entirely independent of
 * db.ts. Writes are real within the process but reset whenever the
 * serverless instance restarts or redeploys — an accepted tradeoff for a
 * read-mostly public demo (see jobsRepository.ts's getDefaultRepository).
 *
 * Pure module otherwise: no fs, no network.
 */
import type { Job } from '@/types/domain'
import type { JobPatch, JobsRepository } from './jobsRepository'

export function createMemoryJobsRepository(
  seedJobs: Job[] = []
): JobsRepository {
  // Newest-first, same convention as the SQLite-backed repository.
  let jobs: Job[] = [...seedJobs]

  function readJobs(): Job[] {
    return [...jobs]
  }

  function writeJobs(nextJobs: Job[]): void {
    jobs = [...nextJobs]
  }

  function findJob(id: string): Job | undefined {
    return jobs.find((job) => job.id === id)
  }

  function prependJob(job: Job): void {
    jobs = [job, ...jobs]
  }

  function updateJob(id: string, patch: JobPatch): Job | null {
    const index = jobs.findIndex((job) => job.id === id)
    if (index === -1) return null
    const updated: Job = { ...jobs[index], ...patch }
    jobs = [...jobs.slice(0, index), updated, ...jobs.slice(index + 1)]
    return updated
  }

  function deleteJob(id: string): { remaining: number } | null {
    const index = jobs.findIndex((job) => job.id === id)
    if (index === -1) return null
    jobs = [...jobs.slice(0, index), ...jobs.slice(index + 1)]
    return { remaining: jobs.length }
  }

  return { readJobs, writeJobs, findJob, prependJob, updateJob, deleteJob }
}
