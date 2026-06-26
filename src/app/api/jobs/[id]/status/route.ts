import { NextResponse } from 'next/server'
import { JOB_STATUSES, type JobStatus } from '@/types/domain'
import { updateJob } from '@/lib/jobs/jobsRepository'

function isValidStatus(value: unknown): value is JobStatus {
  return (
    typeof value === 'string' && JOB_STATUSES.includes(value as JobStatus)
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
          allowed: [...JOB_STATUSES],
        },
        { status: 400 }
      )
    }

    const updatedJob = updateJob(id, {
      status,
      statusUpdatedAt: new Date().toISOString(),
    })

    if (!updatedJob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
          id,
        },
        { status: 404 }
      )
    }

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
