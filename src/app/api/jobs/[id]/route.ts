import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  collectedAt?: string
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

    const jobs = getJobs()

    const exists = jobs.some((job) => job.id === id)

    if (!exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
          id,
        },
        { status: 404 }
      )
    }

    const nextJobs = jobs.filter((job) => job.id !== id)

    saveJobs(nextJobs)

    return NextResponse.json({
      success: true,
      message: 'Job deleted',
      deletedId: id,
      remaining: nextJobs.length,
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
