/**
 * localStorage-backed Profile store helpers (TASK-026).
 *
 * These helpers are the only place that reads/writes the persisted profile
 * store. They are intentionally safe and predictable:
 * - SSR safe: every function guards `typeof window !== 'undefined'`.
 * - Self-healing: invalid / corrupt data falls back to the default store.
 * - A missing `activeProfileId` falls back to DEFAULT_PROFILE_ID.
 *
 * This module does NOT change any analysis logic, AI prompts, or UI. It is a
 * pure data layer for future Profile-driven work.
 */

import {
  DEFAULT_PROFILE_ID,
  createDefaultProfileStore,
} from './defaultProfile'
import {
  JAPAN_CAREER_PROFILE_VERSION,
  PROFILE_STORE_VERSION,
  type JapanCareerProfile,
  type ProfileStore,
} from './types'

export const PROFILE_STORE_KEY = 'jobfit_ai_profile_store'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Validate the *shape* of a stored profile defensively. We only require the
 * fields the rest of the app relies on; anything missing means we treat the
 * store as invalid and fall back to the default.
 */
function isValidProfile(value: unknown): value is JapanCareerProfile {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    p.version === JAPAN_CAREER_PROFILE_VERSION &&
    typeof p.name === 'string' &&
    typeof p.target === 'object' &&
    p.target !== null &&
    typeof p.conditions === 'object' &&
    p.conditions !== null
  )
}

function isValidStore(value: unknown): value is ProfileStore {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return (
    s.version === PROFILE_STORE_VERSION &&
    typeof s.activeProfileId === 'string' &&
    Array.isArray(s.profiles) &&
    s.profiles.length > 0 &&
    s.profiles.every(isValidProfile)
  )
}

/**
 * Ensure the active profile id actually points at an existing profile.
 * If not, fall back to DEFAULT_PROFILE_ID, and if that's also missing,
 * fall back to the first profile in the list.
 */
function normalizeActiveProfileId(store: ProfileStore): ProfileStore {
  const ids = store.profiles.map((p) => p.id)
  if (ids.includes(store.activeProfileId)) return store

  const fallbackId = ids.includes(DEFAULT_PROFILE_ID)
    ? DEFAULT_PROFILE_ID
    : ids[0]

  return { ...store, activeProfileId: fallbackId }
}

/**
 * Best-effort mirror of the store to the server (redesign Phase 2), so
 * analyze routes can resolve the active profile without it being sent in
 * every analyze request body. Fire-and-forget: never throws, never awaited,
 * and never blocks the UI. If it fails, server routes just keep using
 * whatever they last had (or the default profile).
 */
function syncToServer(store: ProfileStore): void {
  if (typeof fetch !== 'function') return
  try {
    fetch('/api/profile-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Ignore synchronous throws (e.g. fetch unavailable in this context).
  }
}

function writeStore(store: ProfileStore): ProfileStore {
  if (!isBrowser()) return store
  try {
    window.localStorage.setItem(PROFILE_STORE_KEY, JSON.stringify(store))
  } catch {
    // Ignore write failures (quota, private mode, etc.); return the in-memory
    // store so callers still get a usable value.
  }
  syncToServer(store)
  return store
}

/**
 * Read the profile store from localStorage.
 * Returns a fresh default store if nothing exists, if the data is invalid,
 * or when running on the server (SSR).
 */
export function getProfileStore(): ProfileStore {
  if (!isBrowser()) return createDefaultProfileStore()

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(PROFILE_STORE_KEY)
  } catch {
    return createDefaultProfileStore()
  }

  if (!raw) return createDefaultProfileStore()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return createDefaultProfileStore()
  }

  if (!isValidStore(parsed)) return createDefaultProfileStore()

  return normalizeActiveProfileId(parsed)
}

/**
 * Persist a store. Stamps `updatedAt` and normalizes the active profile id.
 * On SSR this is a no-op that simply returns the (normalized) store.
 */
export function saveProfileStore(store: ProfileStore): ProfileStore {
  const normalized = normalizeActiveProfileId({
    ...store,
    version: PROFILE_STORE_VERSION,
    updatedAt: nowIso(),
  })
  return writeStore(normalized)
}

/**
 * Get the currently active profile. Falls back to the default profile id and
 * then to the first profile if the active id is missing.
 */
export function getActiveProfile(): JapanCareerProfile {
  const store = getProfileStore()
  const active =
    store.profiles.find((p) => p.id === store.activeProfileId) ??
    store.profiles.find((p) => p.id === DEFAULT_PROFILE_ID) ??
    store.profiles[0]
  return active
}

/**
 * Set the active profile by id. If the id does not exist, the active id is left
 * pointing at a valid profile (default → first) by `normalizeActiveProfileId`.
 */
export function setActiveProfile(profileId: string): ProfileStore {
  const store = getProfileStore()
  return saveProfileStore({ ...store, activeProfileId: profileId })
}

/**
 * Add a new profile. If a profile with the same id already exists it is
 * replaced. The newly added profile becomes active.
 */
export function addProfile(profile: JapanCareerProfile): ProfileStore {
  const store = getProfileStore()
  const others = store.profiles.filter((p) => p.id !== profile.id)
  return saveProfileStore({
    ...store,
    profiles: [...others, profile],
    activeProfileId: profile.id,
  })
}

/**
 * Update an existing profile by id with a partial patch. `id` and `version`
 * are preserved; `updatedAt` is stamped. No-op if the profile does not exist.
 */
export function updateProfile(
  profileId: string,
  updates: Partial<JapanCareerProfile>
): ProfileStore {
  const store = getProfileStore()
  const exists = store.profiles.some((p) => p.id === profileId)
  if (!exists) return store

  const profiles = store.profiles.map((p) => {
    if (p.id !== profileId) return p
    return {
      ...p,
      ...updates,
      id: p.id,
      version: JAPAN_CAREER_PROFILE_VERSION,
      createdAt: p.createdAt,
      updatedAt: nowIso(),
    }
  })

  return saveProfileStore({ ...store, profiles })
}

/**
 * Delete a profile by id. The default profile cannot be deleted, and the store
 * always keeps at least one profile. If the active profile is deleted, the
 * active id falls back via `normalizeActiveProfileId`.
 */
export function deleteProfile(profileId: string): ProfileStore {
  const store = getProfileStore()

  if (profileId === DEFAULT_PROFILE_ID) return store

  const remaining = store.profiles.filter((p) => p.id !== profileId)
  if (remaining.length === 0) return store

  return saveProfileStore({ ...store, profiles: remaining })
}

/**
 * Reset the store back to a fresh default store and persist it.
 */
export function resetProfileStore(): ProfileStore {
  return saveProfileStore(createDefaultProfileStore())
}

/**
 * Import a profile (e.g. from an exported JSON string/object). Invalid input is
 * ignored and the current store is returned unchanged. A valid profile is added
 * and becomes active.
 */
export function importProfile(profile: unknown): ProfileStore {
  if (!isValidProfile(profile)) return getProfileStore()
  return addProfile(profile)
}

/**
 * Export a single profile by id. Returns null if the profile does not exist.
 * Returns a deep-cloned copy so callers can serialize/mutate freely.
 */
export function exportProfile(profileId: string): JapanCareerProfile | null {
  const store = getProfileStore()
  const profile = store.profiles.find((p) => p.id === profileId)
  if (!profile) return null
  return JSON.parse(JSON.stringify(profile)) as JapanCareerProfile
}
