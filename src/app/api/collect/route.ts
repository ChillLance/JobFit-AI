import { NextResponse } from 'next/server'
import { prependJob } from '@/lib/jobs/jobsRepository'
import type { Job } from '@/types/domain'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const newJob: Job = {
      id: crypto.randomUUID(),
      title: body.title || 'Untitled',
      url: body.url || '',
      rawText: body.rawText || '',
      collectedAt: new Date().toISOString(),
    }

    prependJob(newJob)

    return NextResponse.json({
      success: true,
      job: newJob,
    })
  } catch (error) {
    console.error('Collect API Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}
