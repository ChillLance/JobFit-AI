/**
 * Server-only data-access layer for jobs (redesign Phase 2).
 *
 * Backed by SQLite (`data/jobfit.sqlite` via db.ts) instead of raw `fs` reads
 * of `jobs_temp.json`. The exported function names/signatures are unchanged
 * from Phase 1, so every existing call site keeps working untouched. See
 * docs/REDESIGN.md.
 *
 * MUST stay server-side. Do not import from Client Components.
 */
import type { DatabaseSync } from 'node:sqlite'
import { getDb } from './db'
import type { Job } from '@/types/domain'

export type JobPatch = Partial<Omit<Job, 'id'>>

export type JobsRepository = {
  readJobs(): Job[]
  writeJobs(jobs: Job[]): void
  findJob(id: string): Job | undefined
  prependJob(job: Job): void
  updateJob(id: string, patch: JobPatch): Job | null
  deleteJob(id: string): { remaining: number } | null
}

/**
 * Build a jobs repository bound to a given SQLite connection. Exported so
 * tests can pass an isolated in-memory database instead of the shared
 * singleton.
 */
export function createJobsRepository(db: DatabaseSync): JobsRepository {
  function readJobs(): Job[] {
    const rows = db
      .prepare('SELECT data FROM jobs ORDER BY seq DESC')
      .all() as { data: string }[]
    return rows.map((row) => JSON.parse(row.data) as Job)
  }

  function writeJobs(jobs: Job[]): void {
    db.exec('DELETE FROM jobs')
    const insert = db.prepare('INSERT INTO jobs (id, data) VALUES (?, ?)')
    // Preserve newest-first order: insert oldest-first so autoincrement seq
    // reproduces the same order via `ORDER BY seq DESC`.
    for (const job of [...jobs].reverse()) {
      insert.run(job.id, JSON.stringify(job))
    }
  }

  function findJob(id: string): Job | undefined {
    const row = db.prepare('SELECT data FROM jobs WHERE id = ?').get(id) as
      | { data: string }
      | undefined
    return row ? (JSON.parse(row.data) as Job) : undefined
  }

  function prependJob(job: Job): void {
    db.prepare('INSERT INTO jobs (id, data) VALUES (?, ?)').run(
      job.id,
      JSON.stringify(job)
    )
  }

  function updateJob(id: string, patch: JobPatch): Job | null {
    const existing = findJob(id)
    if (!existing) return null
    const updated: Job = { ...existing, ...patch }
    db.prepare('UPDATE jobs SET data = ? WHERE id = ?').run(
      JSON.stringify(updated),
      id
    )
    return updated
  }

  function deleteJob(id: string): { remaining: number } | null {
    const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(id)
    if (Number(result.changes) === 0) return null
    const row = db.prepare('SELECT COUNT(*) AS n FROM jobs').get() as {
      n: number
    }
    return { remaining: Number(row.n) }
  }

  return { readJobs, writeJobs, findJob, prependJob, updateJob, deleteJob }
}

// Lazy singleton: merely importing this module (e.g. to reuse
// createJobsRepository in tests against an isolated database) must never
// open the real data/jobfit.sqlite file. The connection is only made on the
// first actual call.
let defaultRepository: JobsRepository | null = null
function getDefaultRepository(): JobsRepository {
  if (!defaultRepository) defaultRepository = createJobsRepository(getDb())
  return defaultRepository
}

/** Read all jobs, newest first. Never throws. */
export function readJobs(): Job[] {
  return getDefaultRepository().readJobs()
}
/** Overwrite the whole store. Caller is responsible for passing the full list. */
export function writeJobs(jobs: Job[]): void {
  getDefaultRepository().writeJobs(jobs)
}
/** Find a single job by id, or `undefined` when absent. */
export function findJob(id: string): Job | undefined {
  return getDefaultRepository().findJob(id)
}
/** Insert a new job at the front of the list (newest first). */
export function prependJob(job: Job): void {
  getDefaultRepository().prependJob(job)
}
/**
 * Apply a shallow patch to one job and persist.
 * Returns the updated job, or `null` when the id is not found.
 */
export function updateJob(id: string, patch: JobPatch): Job | null {
  return getDefaultRepository().updateJob(id, patch)
}
/**
 * Delete one job and persist.
 * Returns the remaining count, or `null` when the id is not found.
 */
export function deleteJob(id: string): { remaining: number } | null {
  return getDefaultRepository().deleteJob(id)
}
