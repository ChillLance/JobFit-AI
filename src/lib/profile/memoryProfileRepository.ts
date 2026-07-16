/**
 * In-memory ProfileRepository for DEMO_MODE (see jobsRepository.ts's sibling
 * memoryJobsRepository.ts and docs/DEPLOYMENT.md §6). Mirrors
 * createProfileRepository's fallback semantics without touching
 * `node:sqlite`. A fresh serverless instance starts with no synced store, so
 * getActiveProfile() falls back to the default profile — same behavior as
 * the SQLite-backed repository before its first sync.
 */
import { defaultJapanCareerProfile } from './defaultProfile'
import type { JapanCareerProfile, ProfileStore } from './types'
import type { ProfileRepository } from './profileRepository'

export function createMemoryProfileRepository(): ProfileRepository {
  let store: ProfileStore | null = null

  function readStore(): ProfileStore | null {
    return store
  }

  function writeStore(next: ProfileStore): void {
    store = next
  }

  function getActiveProfile(): JapanCareerProfile {
    const current = store
    if (!current || current.profiles.length === 0) {
      return defaultJapanCareerProfile
    }
    return (
      current.profiles.find((p) => p.id === current.activeProfileId) ??
      current.profiles[0]
    )
  }

  return { readStore, writeStore, getActiveProfile }
}
