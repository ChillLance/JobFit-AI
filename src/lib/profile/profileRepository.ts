/**
 * Server-only mirror of the client's ProfileStore (redesign Phase 2 +
 * DEMO_MODE).
 *
 * The client (profileStore.ts) stays the source of truth for the profiles
 * UI, backed by localStorage — nothing about that UI changes. This module
 * keeps a passive server-side copy in the same SQLite database as jobs
 * (data/jobfit.sqlite), updated via POST /api/profile-sync whenever the
 * client saves a change (see profileStore.ts's `syncToServer`). Its only job
 * is to let analyze routes resolve "the active profile" without requiring
 * the client to send the full profile JSON in every analyze request body.
 *
 * If the server has never received a sync yet, `getActiveProfile()` falls
 * back to the default profile — the same fallback the client uses, so
 * behavior for a fresh install is unchanged.
 *
 * `DEMO_MODE=true` swaps the singleton for an in-memory repository (see
 * memoryProfileRepository.ts) so this module never touches `node:sqlite` in
 * a demo deployment — see jobsRepository.ts for the identical pattern and
 * rationale (docs/DEPLOYMENT.md §6). `@/lib/jobs/db` is loaded with a lazy
 * `require()` instead of a top-level `import` for the same reason.
 *
 * MUST stay server-side. Do not import from Client Components.
 */
import type { DatabaseSync } from 'node:sqlite'
import { defaultJapanCareerProfile } from './defaultProfile'
import type { JapanCareerProfile, ProfileStore } from './types'
import { createMemoryProfileRepository } from './memoryProfileRepository'

export type ProfileRepository = {
  readStore(): ProfileStore | null
  writeStore(store: ProfileStore): void
  getActiveProfile(): JapanCareerProfile
}

/**
 * Build a profile repository bound to a given SQLite connection. Exported so
 * tests can pass an isolated in-memory database.
 */
export function createProfileRepository(db: DatabaseSync): ProfileRepository {
  function readStore(): ProfileStore | null {
    const row = db
      .prepare('SELECT data FROM profile_store WHERE id = 1')
      .get() as { data: string } | undefined
    if (!row) return null
    try {
      return JSON.parse(row.data) as ProfileStore
    } catch {
      return null
    }
  }

  function writeStore(store: ProfileStore): void {
    db.prepare(
      `INSERT INTO profile_store (id, data) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`
    ).run(JSON.stringify(store))
  }

  function getActiveProfile(): JapanCareerProfile {
    const store = readStore()
    if (!store || store.profiles.length === 0) return defaultJapanCareerProfile
    return (
      store.profiles.find((p) => p.id === store.activeProfileId) ??
      store.profiles[0]
    )
  }

  return { readStore, writeStore, getActiveProfile }
}

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true'
}

/**
 * Lazily `require()` db.ts only on the non-demo path — see
 * jobsRepository.ts's createSqliteBackedRepository for the full rationale.
 */
function createSqliteBackedRepository(): ProfileRepository {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load, see comment above.
  const { getDb } = require('@/lib/jobs/db') as typeof import('@/lib/jobs/db')
  return createProfileRepository(getDb())
}

// Lazy singleton: merely importing this module (e.g. to reuse
// createProfileRepository in tests against an isolated database) must never
// open the real data/jobfit.sqlite file. The connection is only made on the
// first actual call, and only when not in DEMO_MODE.
let defaultRepository: ProfileRepository | null = null
function getDefaultRepository(): ProfileRepository {
  if (!defaultRepository) {
    defaultRepository = isDemoMode()
      ? createMemoryProfileRepository()
      : createSqliteBackedRepository()
  }
  return defaultRepository
}

/** The mirrored profile store, or `null` if the client has never synced. */
export function readProfileStore(): ProfileStore | null {
  return getDefaultRepository().readStore()
}
/** Overwrite the mirrored store (called by POST /api/profile-sync). */
export function writeProfileStore(store: ProfileStore): void {
  getDefaultRepository().writeStore(store)
}
/** The active profile to use as the analysis baseline, with a default fallback. */
export function getActiveProfileFromDb(): JapanCareerProfile {
  return getDefaultRepository().getActiveProfile()
}
