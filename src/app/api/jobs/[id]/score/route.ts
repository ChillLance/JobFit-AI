import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

type Params = {
  params: Promise<{
    id: string
  }>
}

type Job = {
  id: string
  title?: string
  url?: string
  rawText?: string
  source?: string
  collectedAt?: string
  aiScore?: AiScore
}

type AiScore = {
  score: number
  level: string
  summary: string
  strengths: string[]
  concerns: string[]
  requiredSkills: string[]
  bonusSkills: string[]
  applicationAdvice: string[]
  generatedAt: string
}

const filePath = path.join(process.cwd(), 'jobs_temp.json')

function readJobs(): Job[] {
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
}

function writeJobs(jobs: Job[]) {
  fs.writeFileSync(filePath, JSON.stringify(jobs, null, 2), 'utf-8')
}

function createMockScore(job: Job): AiScore {
  const rawText = job.rawText || ''
  const title = job.title || ''

  const text = `${title}\n${rawText}`.toLowerCase()

  let score = 70

  if (
    text.includes('通訳') ||
    text.includes('翻訳') ||
    text.includes('中国語') ||
    text.includes('英語') ||
    text.includes('日本語')
  ) {
    score += 8
  }

  if (
    text.includes('販売') ||
    text.includes('接客') ||
    text.includes('サービス') ||
    text.includes('レジ')
  ) {
    score += 7
  }

  if (
    text.includes('免税') ||
    text.includes('観光') ||
    text.includes('ホテル') ||
    text.includes('空港')
  ) {
    score += 5
  }

  if (
    text.includes('未経験') ||
    text.includes('初心者') ||
    text.includes('研修')
  ) {
    score += 4
  }

  score += Math.floor(Math.random() * 7)

  if (score > 98) {
    score = 98
  }

  const level =
    score >= 85 ? '高度推薦' : score >= 75 ? '可以考慮' : '普通匹配'

  return {
    score,
    level,
    summary:
      '這是一份由 Mock API 產生的職缺分析摘要。此職缺看起來需要良好的溝通能力、服務意識，以及基本的現場應對能力。',
    strengths: [
      '職缺內容明確，工作地點與職務名稱清楚。',
      '適合具備服務業、銷售、接待或翻譯經驗的人。',
      '若你熟悉日文、中文或觀光客接待，會有一定優勢。',
    ],
    concerns: [
      '實際班表、薪資細節與休假制度需要進一步確認。',
      '現場服務工作可能需要長時間站立與處理臨場狀況。',
      '若職缺描述較簡略，建議面試時補問具體工作內容。',
    ],
    requiredSkills: [
      '顧客服務能力',
      '基本溝通能力',
      '現場問題處理能力',
      '守時與責任感',
    ],
    bonusSkills: [
      '日文或中文口譯能力',
      '免稅店或零售經驗',
      '觀光客接待經驗',
      'POS 或收銀經驗',
    ],
    applicationAdvice: [
      '履歷中強調你過去的服務、銷售、接待或翻譯經驗。',
      '如果有語言能力，請明確寫出程度，例如 JLPT、TOCFL、英檢或實際工作使用經驗。',
      '面試時可以主動詢問班表、薪資、交通補助、試用期與工作範圍。',
      '若你能接受輪班、假日工作或繁忙時段支援，建議在自我介紹中提到。',
    ],
    generatedAt: new Date().toISOString(),
  }
}

export async function POST(_request: Request, context: Params) {
  try {
    const { id } = await context.params

    const jobs = readJobs()
    const jobIndex = jobs.findIndex((job) => job.id === id)

    if (jobIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: '找不到指定職缺',
        },
        {
          status: 404,
        }
      )
    }

    const job = jobs[jobIndex]
    const aiScore = createMockScore(job)

    jobs[jobIndex] = {
      ...job,
      aiScore,
    }

    writeJobs(jobs)

    return NextResponse.json({
      success: true,
      jobId: id,
      generatedAt: aiScore.generatedAt,
      result: aiScore,
    })
  } catch (error) {
    console.error('AI 評分 API 錯誤:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI 評分失敗',
      },
      {
        status: 500,
      }
    )
  }
}
