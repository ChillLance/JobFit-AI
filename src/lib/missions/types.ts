export const SEARCH_MISSION_VERSION = 'search_mission_v1' as const
export const SEARCH_MISSION_STORE_VERSION = 'search_mission_store_v1' as const

export type MissionPriority = 'experience' | 'growth' | 'savings' | 'stability'

export type MissionTradeoff = {
  condition: string
  acceptableWhen: string
}

/**
 * Only structured, explicit conditions are used for automatic blockers.
 * Free-form goals and tradeoffs remain visible to the user rather than being
 * guessed into a score.
 */
export type SearchMissionConstraints = {
  minimumMonthlyIncomeJpy: number | null
  maximumDormFeeJpy: number | null
  privateRoomRequired: boolean | null
  liveInRequired: boolean | null
  splitShiftAccepted: boolean | null
  nightWorkAccepted: boolean | null
  maximumDurationMonths: number | null
}

/** A time-bound job-search purpose, deliberately separate from a career Profile. */
export type SearchMission = {
  id: string
  version: typeof SEARCH_MISSION_VERSION
  name: string
  description: string
  linkedProfileId: string | null
  createdAt: string
  updatedAt: string
  availableFrom: string | null
  availableUntil: string | null
  targetRegions: string[]
  experienceGoals: string[]
  growthGoals: string[]
  /** Terms that may be matched against listing text. Keep them user-confirmed. */
  matchKeywords: string[]
  goalPriorities: MissionPriority[]
  constraints: SearchMissionConstraints
  tradeoffs: MissionTradeoff[]
  notes: string
}

export type SearchMissionStore = {
  version: typeof SEARCH_MISSION_STORE_VERSION
  activeMissionId: string | null
  missions: SearchMission[]
  createdAt: string
  updatedAt: string
}
