/**
 * Server-only data-access layer for jobs (redesign Phase 1).
 *
 * Centralizes every read/write of `jobs_temp.json` behind one interface so the
 * rest of the app never touches `fs` directly. Swapping the storage backend
 * later (SQLite in Phase 2, Postgres/Supabase in Phase 3) means changing only
 * this module — not every route. See docs/REDESIGN.md.
 *
 * MUST stay server-side: it uses `fs` / `path`. Do not import it from Client
 * Components.
 */

import fs from 'fs'
import path from 'path'
import type { Job } from '@/types/domain'

const JOBS_FILE = path.join(process.cwd(), 'jobs_temp.json')

/** Read all jobs. Returns `[]` for a missing / empty / malformed file (never throws). */
export function readJobs(): Job[] {
  try {
    if (!fs.existsSync(JOBS_FILE)) return []
    const content = fs.readFileSync(JOBS_FILE, 'utf-8')
    if (!content.trim()) return []
    const data = JSON.parse(content)
    if (!Array.isArray(data)) return []
    return data as Job[]
  } catch (error) {
    console.error('Failed to read jobs_temp.json:', error)
    return []
  }
}

/** Overwrite the whole store. Caller is responsible for passing the full list. */
export function writeJobs(jobs: Job[]): void {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8')
}

/** Find a single job by id, or `undefined` when absent. */
export function findJob(id: string): Job | undefined {
  return readJobs().find((job) => job.id === id)
}

/** Insert a new job at the front of the list (newest first). */
export function prependJob(job: Job): void {
  const jobs = readJobs()
  jobs.unshift(job)
  writeJobs(jobs)
}

export type JobPatch = Partial<Omit<Job, 'id'>>

/**
 * Apply a shallow patch to one job and persist.
 * Returns the updated job, or `null` when the id is not found.
 */
export function updateJob(id: string, patch: JobPatch): Job | null {
  const jobs = readJobs()
  const index = jobs.findIndex((job) => job.id === id)
  if (index === -1) return null
  const updated: Job = { ...jobs[index], ...patch }
  jobs[index] = updated
  writeJobs(jobs)
  return updated
}

/**
 * Delete one job and persist.
 * Returns the remaining count, or `null` when the id is not found.
 */
export function deleteJob(id: string): { remaining: number } | null {
  const jobs = readJobs()
  if (!jobs.some((job) => job.id === id)) return null
  const next = jobs.filter((job) => job.id !== id)
  writeJobs(next)
  return { remaining: next.length }
}
