import { NextResponse } from 'next/server'
import { readJobs } from '@/lib/jobs/jobsRepository'

export async function GET() {
  const jobs = readJobs()

  return NextResponse.json({
    success: true,
    count: jobs.length,
    jobs,
  })
}
