/**
 * Japan Career Profile schema (TASK-026).
 *
 * This module defines the *data foundation* for future Profile-driven analysis.
 * It intentionally does NOT touch the analysis logic, the AI prompts, or any UI.
 *
 * Schemas are versioned so we can migrate stored data safely in the future:
 * - JapanCareerProfile.version = "japan_career_profile_v1"
 * - ProfileStore.version       = "profile_store_v1"
 */

export const JAPAN_CAREER_PROFILE_VERSION = 'japan_career_profile_v1' as const
export const PROFILE_STORE_VERSION = 'profile_store_v1' as const

export type JapanCareerProfileVersion = typeof JAPAN_CAREER_PROFILE_VERSION
export type ProfileStoreVersion = typeof PROFILE_STORE_VERSION

/**
 * How willing the candidate is to accept a given working condition
 * (overtime, shift work, night shift, relocation/transfer, etc.).
 */
export type ToleranceLevel = 'avoid' | 'low' | 'medium' | 'high' | 'flexible'

/** The job-search lane currently being evaluated by a profile. */
export type WorkSearchMode =
  | 'resort_baito'
  | 'local_baito'
  | 'remote_tech'
  | 'japan_career'
  | 'other'

/** Self-reported Japanese readiness for a concrete work task. */
export type JapaneseTaskReadiness =
  | 'not_ready'
  | 'basic'
  | 'comfortable'
  | 'confident'
  | null

/**
 * Preferred working style regarding remote / on-site work.
 */
export type RemotePreference =
  | 'onsite'
  | 'hybrid'
  | 'remote'
  | 'flexible'
  | 'no_preference'

/**
 * What the candidate is actively looking for.
 */
export type ProfileTarget = {
  /** Job titles / roles the candidate wants (e.g. "Hotel front desk staff"). */
  desiredRoles: string[]
  /** Preferred work locations (e.g. "Fukuoka", "Japan", "Remote"). */
  desiredLocations: string[]
  /** Target industries (e.g. "Hospitality", "Inbound tourism"). */
  industries: string[]
  /** Free-form keywords that signal a good match. */
  preferredKeywords: string[]
}

/**
 * Concrete working conditions and constraints used to judge job fit.
 */
export type ProfileConditions = {
  /** e.g. "full-time", "contract", "part-time", "派遣". */
  acceptableEmploymentTypes: string[]
  /** Minimum acceptable monthly salary (JPY). null = not specified. */
  minimumMonthlySalary: number | null
  /** Minimum acceptable annual salary (JPY). null = not specified. */
  minimumAnnualSalary: number | null
  overtimeTolerance: ToleranceLevel
  shiftWorkTolerance: ToleranceLevel
  nightShiftTolerance: ToleranceLevel
  /** Willingness to accept relocation / 転勤. */
  transferTolerance: ToleranceLevel
  remotePreference: RemotePreference
}

/**
 * Visa / work-authorization situation in Japan.
 */
export type ProfileVisa = {
  /** Current residence status (e.g. "Working Holiday", "技術・人文知識・国際業務"). */
  currentStatus: string
  /** Whether the candidate needs visa sponsorship / support from the employer. */
  needsVisaSupport: boolean
  notes: string
}

/**
 * Language ability relevant to working in Japan.
 */
export type ProfileLanguages = {
  /** e.g. "JLPT N2", "Native", "Business level". */
  japaneseLevel: string
  /** e.g. "B2", "Business level", "Conversational". */
  englishLevel: string
  /** Any other languages (e.g. "Traditional Chinese (native)"). */
  otherLanguages: string[]
}

/**
 * Soft preferences and hard stops.
 */
export type ProfilePreferences = {
  /** What the candidate values in a workplace. */
  values: string[]
  /** Hard stops that should disqualify a job. */
  dealBreakers: string[]
  /** Situations the candidate wants to avoid (softer than deal breakers). */
  risksToAvoid: string[]
}

/**
 * Career direction and longer-term outlook.
 */
export type ProfileCareer = {
  /** The current, near-term direction (e.g. hospitality + junior web). */
  currentDirection: string
  /** The concrete goal the candidate is working toward. */
  careerGoal: string
  /** Longer-term vision / positioning. */
  futureVision: string
  /** Whether the candidate is open to changing career tracks. */
  openToCareerChange: boolean
}

/**
 * Working-holiday-specific logistics that affect job fit beyond the generic
 * target/conditions fields (driver's license, split-shift tolerance, how long
 * / from when the candidate can work, and a savings goal used against
 * `estimateMonthlySavings` — see src/lib/jobs/savings.ts).
 *
 * Optional on `JapanCareerProfile` so existing stored profiles (which predate
 * this field) keep validating and loading without migration.
 */
export type ProfileWorkingHoliday = {
  /** Keeps resort baito, local baito, remote-tech, and long-term search logic separate. */
  workSearchMode?: WorkSearchMode | null
  hasDriverLicense: boolean | null
  /** Tolerance for 中抜けシフト (split shifts with an unpaid midday gap). */
  splitShiftTolerance: ToleranceLevel | null
  /** Longest number of months the candidate can work continuously. */
  availableMonths: number | null
  /** e.g. '2026-10' — when the candidate can start. */
  availableFrom: string | null
  /** e.g. '2027-03' — latest practical end date for this search. */
  availableUntil?: string | null
  /** User-confirmed visa / residence-status expiry. Never infer this from prose. */
  visaExpiryDate?: string | null
  targetMonthlySavingsJpy: number | null
  privateRoomRequired: boolean | null
  /** Whether live-in housing is required, preferred, or unnecessary. */
  dormitoryPreference?: 'required' | 'preferred' | 'not_needed' | null
  wifiRequired?: boolean | null
  mealsPreference?: 'required' | 'preferred' | 'not_needed' | null
  targetSeasons?: string[]
  japaneseTaskReadiness?: {
    customerService: JapaneseTaskReadiness
    phone: JapaneseTaskReadiness
    rulesReading: JapaneseTaskReadiness
    interview: JapaneseTaskReadiness
  }
}

/**
 * A single, versioned Japan-focused career profile.
 */
export type JapanCareerProfile = {
  id: string
  version: JapanCareerProfileVersion
  name: string
  description: string
  /** ISO 8601 timestamp. */
  createdAt: string
  /** ISO 8601 timestamp. */
  updatedAt: string
  target: ProfileTarget
  conditions: ProfileConditions
  visa: ProfileVisa
  languages: ProfileLanguages
  preferences: ProfilePreferences
  /** Core strengths the candidate can lead with. */
  strengths: string[]
  /** Transferable skills that apply across roles/industries. */
  transferableSkills: string[]
  career: ProfileCareer
  /** Free-form notes. */
  notes: string
  /** Optional — working-holiday-specific logistics (see ProfileWorkingHoliday). */
  workingHoliday?: ProfileWorkingHoliday
}

/**
 * A versioned container for one or more profiles plus the active selection.
 * This is what gets persisted to localStorage.
 */
export type ProfileStore = {
  version: ProfileStoreVersion
  /** Id of the currently selected profile. */
  activeProfileId: string
  profiles: JapanCareerProfile[]
  /** ISO 8601 timestamp. */
  createdAt: string
  /** ISO 8601 timestamp. */
  updatedAt: string
}
