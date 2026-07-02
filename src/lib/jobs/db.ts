/**
 * Shared SQLite connection for JobFit-AI (redesign Phase 2).
 *
 * Single file (`data/jobfit.sqlite`) holds both the `jobs` table and the
 * mirrored `profile_store` table (see src/lib/profile/profileRepository.ts).
 * Uses Node's built-in `node:sqlite` — no native dependency to install/build.
 *
 * MUST stay server-side. Do not import from Client Components.
 */
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import type { Job } from '@/types/domain'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT UNIQUE NOT NULL,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS profile_store (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);
`

/** Open (creating if needed) a database at `location` with the app schema applied. */
export function createDatabase(location: string): DatabaseSync {
  const db = new DatabaseSync(location)
  db.exec(SCHEMA)
  return db
}

/**
 * One-time import from the legacy `jobs_temp.json` file into the `jobs`
 * table, only when the table is still empty. The JSON file is read-only here
 * and is never deleted or rewritten — it stays on disk as a historical
 * snapshot (see docs/REDESIGN.md §6, migration safety principles).
 */
function migrateLegacyJobsJson(db: DatabaseSync): void {
  const countRow = db.prepare('SELECT COUNT(*) AS n FROM jobs').get() as
    | { n: number }
    | undefined
  if (countRow && Number(countRow.n) > 0) return

  const jsonPath = path.join(process.cwd(), 'jobs_temp.json')
  if (!fs.existsSync(jsonPath)) return

  let jobs: Job[]
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8').trim()
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return
    jobs = parsed as Job[]
  } catch (error) {
    console.error('Failed to read legacy jobs_temp.json for migration:', error)
    return
  }
  if (jobs.length === 0) return

  const insert = db.prepare('INSERT INTO jobs (id, data) VALUES (?, ?)')
  // jobs_temp.json is newest-first; insert oldest-first so the autoincrement
  // seq reproduces the same order once read back via `ORDER BY seq DESC`.
  let migrated = 0
  for (const job of [...jobs].reverse()) {
    if (!job || typeof job.id !== 'string') continue
    insert.run(job.id, JSON.stringify(job))
    migrated += 1
  }
  if (migrated > 0) {
    console.log(
      `[jobfit-db] Migrated ${migrated} job(s) from jobs_temp.json into data/jobfit.sqlite. jobs_temp.json is left untouched on disk.`
    )
  }
}

let singleton: DatabaseSync | null = null

/** Shared singleton connection to the app's SQLite database. */
export function getDb(): DatabaseSync {
  if (singleton) return singleton
  const dataDir = path.join(process.cwd(), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  singleton = createDatabase(path.join(dataDir, 'jobfit.sqlite'))
  migrateLegacyJobsJson(singleton)
  return singleton
}
