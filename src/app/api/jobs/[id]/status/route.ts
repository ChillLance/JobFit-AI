import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const VALID_STATUSES = [
  'not_applied',
  'applied',
  'interview',
  'not_interested',
] as const

type JobStatus = (typeof VALID_STATUSES)[number]

type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  collectedAt?: string
  status?: JobStatus
  statusUpdatedAt?: string
  aiScore?: Record<string, unknown>
}

const filePath = path.join(process.cwd(), 'jobs_temp.json')

function getJobs(): Job[] {
  try {
    if (!fs.existsSync(filePath)) {
      return []
    }

    const content = fs.readFileSync(filePath, 'utf-8')

    if (!content.trim()) {
      return []
    }

    const data = JSON.parse(content)

    if (!Array.isArray(data)) {
      return []
    }

    return data
  } catch (error) {
    console.error('讀取 jobs_temp.json 失敗:', error)
    return []
  }
}

function saveJobs(jobs: Job[]) {
  fs.writeFileSync(filePath, JSON.stringify(jobs, null, 2), 'utf-8')
}

function isValidStatus(value: unknown): value is JobStatus {
  return (
    typeof value === 'string' &&
    VALID_STATUSES.includes(value as JobStatus)
  )
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing job id',
        },
        { status: 400 }
      )
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON body',
        },
        { status: 400 }
      )
    }

    const status =
      body && typeof body === 'object' && 'status' in body
        ? (body as { status: unknown }).status
        : undefined

    if (!isValidStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing status',
          allowed: [...VALID_STATUSES],
        },
        { status: 400 }
      )
    }

    const jobs = getJobs()
    const jobIndex = jobs.findIndex((job) => job.id === id)

    if (jobIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
          id,
        },
        { status: 404 }
      )
    }

    const job = jobs[jobIndex]
    const statusUpdatedAt = new Date().toISOString()

    const updatedJob: Job = {
      ...job,
      status,
      statusUpdatedAt,
    }

    jobs[jobIndex] = updatedJob
    saveJobs(jobs)

    return NextResponse.json({
      success: true,
      job: updatedJob,
    })
  } catch (error) {
    console.error('PATCH /api/jobs/[id]/status failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
