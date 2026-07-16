import type { JobExtraction } from '@/types/extraction'
import type { JapanCareerProfile } from '@/lib/profile'
import type { SearchMission } from '@/lib/missions'
import type { SavingsEstimate } from '@/lib/jobs/savings'

export type ApplicationKitJob = {
  id: string
  title?: string
  company?: string
  location?: string
  employmentType?: string
  salary?: string
  rawText?: string
  extraction?: JobExtraction | null
}

export type ApplicationKitFactSource = 'profile' | 'mission' | 'listing'

export type ApplicationKitFact = {
  source: ApplicationKitFactSource
  label: string
  value: string
}

export type ApplicationKit = {
  motivationDraft: string
  desiredConditionsDraft: string
  resumeFocus: string[]
  questions: string[]
  questionsTiming: 'before_direct_application' | 'after_agency_match'
  facts: ApplicationKitFact[]
  warnings: string[]
  savings: SavingsEstimate | null
  polishPrompt: string
}

export type ApplicationKitInput = {
  job: ApplicationKitJob
  profile: JapanCareerProfile
  mission: SearchMission | null
}
