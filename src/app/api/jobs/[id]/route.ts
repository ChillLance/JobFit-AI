import { NextResponse } from 'next/server'
import { deleteJob } from '@/lib/jobs/jobsRepository'

export async function DELETE(
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

    const result = deleteJob(id)

    if (!result) {
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
      message: 'Job deleted',
      deletedId: id,
      remaining: result.remaining,
    })
  } catch (error) {
    console.error('DELETE /api/jobs/[id] failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
