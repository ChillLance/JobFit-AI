import { NextResponse } from 'next/server'
import { writeProfileStore } from '@/lib/profile/profileRepository'
import { PROFILE_STORE_VERSION } from '@/lib/profile/types'
import type { ProfileStore } from '@/lib/profile/types'

// Client-only sync endpoint: the profiles UI (localStorage-backed) POSTs its
// full store here on every save so analyze routes can resolve the active
// profile server-side, without needing it in every analyze request body.
// Fire-and-forget from the client (see profileStore.ts) — never blocks the UI.

function isPlausibleStore(value: unknown): value is ProfileStore {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return (
    s.version === PROFILE_STORE_VERSION &&
    typeof s.activeProfileId === 'string' &&
    Array.isArray(s.profiles) &&
    s.profiles.length > 0
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!isPlausibleStore(body)) {
      return NextResponse.json(
        { error: 'Invalid profile store payload' },
        { status: 400 }
      )
    }

    writeProfileStore(body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/profile-sync failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
