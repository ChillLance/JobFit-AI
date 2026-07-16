import {
  SEARCH_MISSION_STORE_VERSION,
  SEARCH_MISSION_VERSION,
  type MissionPriority,
  type SearchMission,
  type SearchMissionStore,
} from './types'

export const SEARCH_MISSION_STORE_KEY = 'jobfit_ai_search_mission_store'

function nowIso(): string {
  return new Date().toISOString()
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `mission_${crypto.randomUUID()}`
  }
  return `mission_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function createBlankSearchMission(linkedProfileId: string | null = null): SearchMission {
  const stamp = nowIso()
  return {
    id: genId(),
    version: SEARCH_MISSION_VERSION,
    name: '',
    description: '',
    linkedProfileId,
    createdAt: stamp,
    updatedAt: stamp,
    availableFrom: null,
    availableUntil: null,
    targetRegions: [],
    experienceGoals: [],
    growthGoals: [],
    matchKeywords: [],
    goalPriorities: ['experience', 'growth', 'savings', 'stability'],
    constraints: {
      minimumMonthlyIncomeJpy: null,
      maximumDormFeeJpy: null,
      privateRoomRequired: null,
      liveInRequired: null,
      splitShiftAccepted: null,
      nightWorkAccepted: null,
      maximumDurationMonths: null,
    },
    tradeoffs: [],
    notes: '',
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean) : []
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

const MISSION_PRIORITIES: MissionPriority[] = ['experience', 'growth', 'savings', 'stability']

/**
 * Normalizes only the user-facing Mission fields from an AI-produced JSON
 * object. IDs, timestamps, and storage versions are always created locally.
 */
export function createSearchMissionFromJson(input: unknown, linkedProfileId: string | null = null): SearchMission | null {
  const source = asRecord(input)
  if (!source || typeof source.name !== 'string' || !source.name.trim()) return null

  const mission = createBlankSearchMission(linkedProfileId)
  const sourceConstraints = asRecord(source.constraints) ?? {}
  const rawPriorities = strings(source.goalPriorities).filter((value): value is MissionPriority => MISSION_PRIORITIES.includes(value as MissionPriority))
  const uniquePriorities = [...new Set([...rawPriorities, ...MISSION_PRIORITIES])]
  const tradeoffs = Array.isArray(source.tradeoffs)
    ? source.tradeoffs.flatMap((entry) => {
      const item = asRecord(entry)
      return item && typeof item.condition === 'string' && typeof item.acceptableWhen === 'string' && item.condition.trim() && item.acceptableWhen.trim()
        ? [{ condition: item.condition.trim(), acceptableWhen: item.acceptableWhen.trim() }]
        : []
    })
    : []

  return {
    ...mission,
    name: source.name.trim(),
    description: typeof source.description === 'string' ? source.description.trim() : '',
    availableFrom: typeof source.availableFrom === 'string' ? source.availableFrom : null,
    availableUntil: typeof source.availableUntil === 'string' ? source.availableUntil : null,
    targetRegions: strings(source.targetRegions),
    experienceGoals: strings(source.experienceGoals),
    growthGoals: strings(source.growthGoals),
    matchKeywords: strings(source.matchKeywords),
    goalPriorities: uniquePriorities,
    constraints: {
      minimumMonthlyIncomeJpy: nullableNumber(sourceConstraints.minimumMonthlyIncomeJpy),
      maximumDormFeeJpy: nullableNumber(sourceConstraints.maximumDormFeeJpy),
      privateRoomRequired: nullableBoolean(sourceConstraints.privateRoomRequired),
      liveInRequired: nullableBoolean(sourceConstraints.liveInRequired),
      splitShiftAccepted: nullableBoolean(sourceConstraints.splitShiftAccepted),
      nightWorkAccepted: nullableBoolean(sourceConstraints.nightWorkAccepted),
      maximumDurationMonths: nullableNumber(sourceConstraints.maximumDurationMonths),
    },
    tradeoffs,
    notes: typeof source.notes === 'string' ? source.notes.trim() : '',
  }
}

export function createEmptySearchMissionStore(): SearchMissionStore {
  const stamp = nowIso()
  return {
    version: SEARCH_MISSION_STORE_VERSION,
    activeMissionId: null,
    missions: [],
    createdAt: stamp,
    updatedAt: stamp,
  }
}

function isMission(value: unknown): value is SearchMission {
  if (!value || typeof value !== 'object') return false
  const mission = value as Record<string, unknown>
  return (
    mission.version === SEARCH_MISSION_VERSION &&
    typeof mission.id === 'string' &&
    typeof mission.name === 'string' &&
    Array.isArray(mission.goalPriorities) &&
    Boolean(mission.constraints) &&
    typeof mission.constraints === 'object'
  )
}

function isStore(value: unknown): value is SearchMissionStore {
  if (!value || typeof value !== 'object') return false
  const store = value as Record<string, unknown>
  return (
    store.version === SEARCH_MISSION_STORE_VERSION &&
    (typeof store.activeMissionId === 'string' || store.activeMissionId === null) &&
    Array.isArray(store.missions) &&
    store.missions.every(isMission)
  )
}

function normalizeActiveMissionId(store: SearchMissionStore): SearchMissionStore {
  if (store.activeMissionId && store.missions.some((mission) => mission.id === store.activeMissionId)) {
    return store
  }
  return { ...store, activeMissionId: store.missions[0]?.id ?? null }
}

function persist(store: SearchMissionStore): SearchMissionStore {
  const normalized = normalizeActiveMissionId({
    ...store,
    version: SEARCH_MISSION_STORE_VERSION,
    updatedAt: nowIso(),
  })
  if (!isBrowser()) return normalized
  try {
    window.localStorage.setItem(SEARCH_MISSION_STORE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new Event('jobfit-search-missions-changed'))
  } catch {
    // Private mode or quota failures should not make the UI unusable.
  }
  return normalized
}

export function getSearchMissionStore(): SearchMissionStore {
  if (!isBrowser()) return createEmptySearchMissionStore()
  try {
    const raw = window.localStorage.getItem(SEARCH_MISSION_STORE_KEY)
    if (!raw) return createEmptySearchMissionStore()
    const parsed: unknown = JSON.parse(raw)
    return isStore(parsed) ? normalizeActiveMissionId(parsed) : createEmptySearchMissionStore()
  } catch {
    return createEmptySearchMissionStore()
  }
}

export function getActiveSearchMission(): SearchMission | null {
  const store = getSearchMissionStore()
  return store.missions.find((mission) => mission.id === store.activeMissionId) ?? null
}

export function saveSearchMission(mission: SearchMission): SearchMissionStore {
  const store = getSearchMissionStore()
  const updated: SearchMission = {
    ...mission,
    version: SEARCH_MISSION_VERSION,
    updatedAt: nowIso(),
  }
  const others = store.missions.filter((entry) => entry.id !== mission.id)
  return persist({ ...store, missions: [...others, updated], activeMissionId: updated.id })
}

export function setActiveSearchMission(missionId: string): SearchMissionStore {
  const store = getSearchMissionStore()
  if (!store.missions.some((mission) => mission.id === missionId)) return store
  return persist({ ...store, activeMissionId: missionId })
}

export function deleteSearchMission(missionId: string): SearchMissionStore {
  const store = getSearchMissionStore()
  return persist({ ...store, missions: store.missions.filter((mission) => mission.id !== missionId) })
}
