/**
 * Default Japan Career Profile (TASK-026).
 *
 * The values below migrate the existing hard-coded candidate preferences that
 * currently live in the project-root `user_profile.json` (a Taiwanese
 * early-career candidate based in Fukuoka, JLPT N2, focused on multilingual
 * hospitality plus junior web / AI-assisted development). Keeping these in sync
 * lets future Profile-driven analysis reuse the same intent without changing
 * the existing analysis logic yet.
 *
 * This is a static, side-effect-free module: it only builds objects.
 */

import {
  JAPAN_CAREER_PROFILE_VERSION,
  PROFILE_STORE_VERSION,
  type JapanCareerProfile,
  type ProfileStore,
} from './types'

export const DEFAULT_PROFILE_ID = 'default_japan_career_profile'

/**
 * A fixed timestamp for the default profile so the seeded store is
 * deterministic (and doesn't churn `createdAt` on every load). Store helpers
 * still update `updatedAt` when the user actually changes something.
 */
const DEFAULT_PROFILE_TIMESTAMP = '2026-01-01T00:00:00.000Z'

export const defaultJapanCareerProfile: JapanCareerProfile = {
  id: DEFAULT_PROFILE_ID,
  version: JAPAN_CAREER_PROFILE_VERSION,
  name: 'Default Japan Career Profile',
  description:
    'Taiwanese early-career candidate based in Fukuoka, Japan. Native Chinese speaker with JLPT N2 Japanese and practical English. Strengths in multilingual hospitality, hotel/cafe service, SNS/community management, and AI-assisted junior web development.',
  createdAt: DEFAULT_PROFILE_TIMESTAMP,
  updatedAt: DEFAULT_PROFILE_TIMESTAMP,
  target: {
    desiredRoles: [
      'Hotel front desk staff',
      'Guesthouse staff',
      'Hostel staff',
      'Cafe bar staff',
      'Multilingual customer service staff',
      'Inbound tourism staff',
      'Reception staff',
      'Event assistant',
      'SNS operation assistant',
      'PR assistant',
      'Community manager assistant',
      'Junior web developer',
      'Junior frontend developer',
      'AI-assisted developer',
    ],
    desiredLocations: ['Fukuoka', 'Japan', 'Remote', 'Hybrid'],
    industries: [
      'Hospitality',
      'Guesthouse / hostel / hotel operations',
      'Cafe and customer service',
      'Inbound tourism',
      'Event and community',
      'SNS / PR',
      'Web development',
      'AI-assisted product building',
    ],
    preferredKeywords: [
      '接客',
      'フロント',
      '受付',
      '多言語',
      'インバウンド',
      '外国人対応',
      'カフェ',
      'SNS',
      'イベント',
      '未経験歓迎',
      '研修あり',
      'React',
      'Next.js',
      'TypeScript',
      'frontend',
      'AI',
    ],
  },
  conditions: {
    acceptableEmploymentTypes: [
      'full-time',
      'contract',
      'part-time',
      'seasonal',
      'アルバイト',
      'パート',
      '契約社員',
      '正社員',
    ],
    minimumMonthlySalary: null,
    minimumAnnualSalary: null,
    overtimeTolerance: 'low',
    shiftWorkTolerance: 'high',
    nightShiftTolerance: 'medium',
    transferTolerance: 'low',
    remotePreference: 'flexible',
  },
  visa: {
    currentStatus: '',
    needsVisaSupport: true,
    notes:
      'Taiwanese national based in Japan. Confirm visa status / sponsorship requirements per job before applying.',
  },
  languages: {
    japaneseLevel: 'JLPT N2',
    englishLevel: 'B2 (practical communication)',
    otherLanguages: ['Traditional Chinese / Mandarin (native)'],
  },
  preferences: {
    values: [
      'Junior-friendly team',
      'Clear tasks and feedback loops',
      'Supportive and multicultural workplace',
      'Customer-facing environment',
      'Mentorship available',
    ],
    dealBreakers: [
      'Roles requiring fluent business Japanese from day one without support',
      'Senior-only engineering roles',
      'Positions where language support or onboarding is insufficient',
    ],
    risksToAvoid: [
      'Highly ambiguous roles with no mentorship',
      'Roles requiring deep backend ownership from day one',
      'Roles requiring advanced infrastructure experience',
      'Sales roles with heavy individual quota pressure and little training',
    ],
  },
  strengths: [
    'Native Chinese communication',
    'Japanese customer service communication (JLPT N2)',
    'Multilingual guest support',
    'Hospitality service and hotel front desk support',
    'Cafe customer service and drink preparation',
    'Community management and SNS operation',
    'Event planning and participant support',
    'AI-assisted development workflow',
  ],
  transferableSkills: [
    'Clear and polite cross-cultural communication',
    'Guest guidance and problem solving',
    'Creating a welcoming atmosphere',
    'Content creation (Canva, photography, basic video editing)',
    'React / Next.js / TypeScript fundamentals',
    'REST API concepts and JSON-based persistence',
    'Basic PC operations, data entry, Google Workspace',
    'Git basics and step-by-step problem solving with AI',
  ],
  career: {
    currentDirection:
      'Multilingual hospitality, guesthouse/hostel/hotel and cafe service, inbound tourism, and SNS/event support — with a secondary track in junior frontend / AI-assisted web development.',
    careerGoal:
      'Build a stable foundation for living and working in Japan while gaining practical Japanese workplace communication experience.',
    futureVision:
      'A multilingual, Japan-based professional who connects people, places, cultures, and technology through hospitality, community building, SNS communication, and AI-assisted product development.',
    openToCareerChange: true,
  },
  notes:
    'Migrated from the project-root user_profile.json. Japanese is practical for many customer-service situations but advanced business Japanese is still a growth area; web development should be evaluated at junior / trainee level.',
  workingHoliday: {
    hasDriverLicense: null,
    splitShiftTolerance: null,
    availableMonths: null,
    availableFrom: null,
    targetMonthlySavingsJpy: null,
    privateRoomRequired: null,
  },
}

/**
 * Build a fresh ProfileStore seeded with the default profile.
 * Callers (e.g. the localStorage helpers) use this whenever no valid store
 * exists yet.
 */
export function createDefaultProfileStore(): ProfileStore {
  const now = new Date().toISOString()
  return {
    version: PROFILE_STORE_VERSION,
    activeProfileId: DEFAULT_PROFILE_ID,
    // Clone so callers can mutate the returned store without touching the
    // shared default constant.
    profiles: [{ ...defaultJapanCareerProfile }],
    createdAt: now,
    updatedAt: now,
  }
}
