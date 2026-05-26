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

export async function GET() {
  const jobs = getJobs()

  return NextResponse.json({
    success: true,
    count: jobs.length,
    jobs,
  })
}
