import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import {
  analyzeJobLocally,
  type LocalAnalyzableJob,
} from '@/lib/analysis/localAnalysis'
import {
  defaultJapanCareerProfile,
  JAPAN_CAREER_PROFILE_VERSION,
  type JapanCareerProfile,
} from '@/lib/profile'

// Profile-driven local rule-based analysis (TASK-029).
// The active JapanCareerProfile is sent by the client in the request body and
// used as the decision baseline. If no valid profile is provided we fall back
// to the default profile so existing behavior never crashes.

type Params = {
  params: Promise<{
    id: string
  }>
}

type Job = LocalAnalyzableJob & {
  id: string
}

const jobsFilePath = path.join(process.cwd(), 'jobs_temp.json')

async function readJsonFile<T>(filePath: string, label: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    if (!content.trim()) {
      throw new Error(`${label} is empty`)
    }
    return JSON.parse(content) as T
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read ${label}: ${message}`)
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// Defensive shape check: require the fields the analyzer relies on. Anything
// else means we treat the input as missing and fall back to the default.
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
    p.conditions !== null &&
    typeof p.preferences === 'object' &&
    p.preferences !== null &&
    typeof p.languages === 'object' &&
    p.languages !== null &&
    typeof p.visa === 'object' &&
    p.visa !== null
  )
}

async function resolveProfile(request: Request): Promise<JapanCareerProfile> {
  try {
    const body = (await request.json()) as { profile?: unknown } | null
    if (body && typeof body === 'object' && isValidProfile(body.profile)) {
      return body.profile
    }
  } catch {
    // No / invalid body — fall back to default below.
  }
  return defaultJapanCareerProfile
}

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    let jobsRaw: unknown
    try {
      jobsRaw = await readJsonFile<unknown>(jobsFilePath, 'jobs_temp.json')
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }

    if (!Array.isArray(jobsRaw)) {
      return NextResponse.json(
        { error: 'jobs_temp.json is not an array' },
        { status: 500 }
      )
    }

    const jobs = jobsRaw as Job[]
    const job = jobs.find((j) => j?.id === id)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', jobId: id },
        { status: 404 }
      )
    }

    const profile = await resolveProfile(request)
    const result = analyzeJobLocally(job, profile)

    const updatedJobs = jobs.map((j) =>
      j.id === id ? { ...j, analysis: result } : j
    )

    try {
      await writeJsonFile(jobsFilePath, updatedJobs)
    } catch (error) {
      console.error('Failed to persist local analysis result:', error)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/jobs/[id]/analyze failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
