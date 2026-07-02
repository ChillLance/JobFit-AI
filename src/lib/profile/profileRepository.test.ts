import { describe, expect, it } from 'vitest'
import { createDatabase } from '@/lib/jobs/db'
import { createProfileRepository } from './profileRepository'
import { defaultJapanCareerProfile } from './defaultProfile'
import { PROFILE_STORE_VERSION, type ProfileStore } from './types'

function makeRepo() {
  return createProfileRepository(createDatabase(':memory:'))
}

function store(overrides: Partial<ProfileStore> = {}): ProfileStore {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    version: PROFILE_STORE_VERSION,
    activeProfileId: defaultJapanCareerProfile.id,
    profiles: [defaultJapanCareerProfile],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('profileRepository (SQLite)', () => {
  it('getActiveProfile falls back to the default profile before any sync', () => {
    const repo = makeRepo()
    expect(repo.readStore()).toBeNull()
    expect(repo.getActiveProfile().id).toBe(defaultJapanCareerProfile.id)
  })

  it('writeStore + getActiveProfile resolves the active profile from the mirror', () => {
    const repo = makeRepo()
    const custom = { ...defaultJapanCareerProfile, id: 'custom', name: 'Custom' }
    repo.writeStore(
      store({ activeProfileId: 'custom', profiles: [defaultJapanCareerProfile, custom] })
    )

    expect(repo.getActiveProfile().name).toBe('Custom')
  })

  it('writeStore overwrites a previous sync (upsert, not append)', () => {
    const repo = makeRepo()
    repo.writeStore(store())
    repo.writeStore(store({ activeProfileId: 'still-default-only' }))

    // activeProfileId points nowhere real -> falls back to the first profile.
    expect(repo.getActiveProfile().id).toBe(defaultJapanCareerProfile.id)
    expect(repo.readStore()?.profiles).toHaveLength(1)
  })
})
