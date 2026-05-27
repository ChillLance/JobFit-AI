import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

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
  company?: string
}

type UserProfile = {
  profileVersion?: number
  summary?: string
  targetRoles?: string[]
  careerDirections?: {
    primary?: string[]
    secondary?: string[]
  }
  skills?: {
    strong?: string[]
    familiar?: string[]
    learning?: string[]
  }
  languages?: Array<{
    language?: string
    level?: string
    notes?: string
  }>
}

type RecommendedAction = 'apply' | 'maybe' | 'skip'

type AnalyzeResponse = {
  jobId: string
  source: 'local-placeholder'
  analysisVersion: 1
  fitScore: number
  recommendedAction: RecommendedAction
  summary: string
  strengths: string[]
  gaps: string[]
  requiredSkills: string[]
  bonusSkills: string[]
  resumeAdvice: string[]
  interviewPrep: string[]
  metadata: {
    jobTitle: string
    company: string
    profileVersion: number
  }
}

const jobsFilePath = path.join(process.cwd(), 'jobs_temp.json')
const profileFilePath = path.join(process.cwd(), 'user_profile.json')

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

function clampScore(n: number) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function uniq(items: string[]) {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)))
}

function normalize(text: string) {
  return text.toLowerCase()
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n))
}

function recommendedActionLabel(action: RecommendedAction): string {
  switch (action) {
    case 'apply':
      return '建議投遞'
    case 'maybe':
      return '可以考慮'
    case 'skip':
      return '暫不建議'
    default:
      return action
  }
}

function makeAnalysis(job: Job, profile: UserProfile): AnalyzeResponse {
  const jobTitle = job.title || ''
  const company = job.company || ''
  const rawText = job.rawText || ''

  const profileVersion =
    typeof profile.profileVersion === 'number' ? profile.profileVersion : 1

  const profileTextParts: string[] = [
    profile.summary || '',
    ...(profile.targetRoles || []),
    ...(profile.careerDirections?.primary || []),
    ...(profile.careerDirections?.secondary || []),
    ...(profile.skills?.strong || []),
    ...(profile.skills?.familiar || []),
    ...(profile.skills?.learning || []),
    ...((profile.languages || []).flatMap((l) => [
      l.language || '',
      l.level || '',
      l.notes || '',
    ]) as string[]),
  ]

  const jobText = normalize(`${jobTitle}\n${company}\n${rawText}`)
  const profileText = normalize(profileTextParts.join('\n'))

  // Keyword groups for more structured matching
  const hospitalityKeywords = [
    'hotel',
    'hostel',
    'guesthouse',
    'cafe',
    'reception',
    'front desk',
    'inbound',
    'tourism',
    'customer service',
    // Japanese hospitality / front desk
    'ホテル',
    'フロント',
    '受付',
    'レセプション',
    '宿泊',
    '旅館',
    'ゲストハウス',
    'ホステル',
    'チェックイン',
    'チェックアウト',
    '夜勤',
    'ナイトフロント',
    '客室',
    '接客',
    'お客様対応',
    '観光',
    '旅行',
    'インバウンド',
    '外国人対応',
  ]

  const languageKeywords = [
    'multilingual',
    'chinese',
    'japanese',
    'english',
    '中国語',
    '英語',
    '日本語',
    '外国語',
    '多言語',
    'バイリンガル',
    '台湾',
    '中国',
    '海外',
    '留学生',
    'n2',
    'jlpt',
  ]

  const snsPrKeywords = [
    'sns',
    'instagram',
    'insta',
    'tiktok',
    '広報',
    'pr',
    'マーケティング',
    'marketing',
    'イベント',
    'event',
    'コミュニティ',
    'community',
    '写真',
    '撮影',
    'canva',
  ]

  const cafeServiceKeywords = [
    'カフェ',
    '飲食',
    'ホール',
    'レジ',
    '接客販売',
    'サービススタッフ',
  ]

  const juniorFriendlyKeywords = [
    '未経験',
    '未経験歓迎',
    '学歴不問',
    '研修あり',
    '初心者',
    'ブランクok',
    '第二新卒',
    'アルバイト',
    'パート',
    '契約社員',
    'entry',
    'junior',
  ]

  const webFrontendKeywords = [
    'react',
    'next.js',
    'nextjs',
    'typescript',
    'javascript',
    'フロントエンド',
    'frontend',
    'web',
    'ai',
    '生成ai',
    'チャットボット',
    'アプリ開発',
  ]

  const lowFitKeywords = [
    'senior',
    'lead',
    'manager',
    '店長',
    '支配人',
    'マネージャー',
    '責任者',
    'リーダー経験必須',
    '実務経験3年以上',
    '実務経験５年以上',
    '実務経験5年以上',
    '実務経験３年以上',
    '実務経験７年以上',
    '実務経験7年以上',
    'ネイティブレベル',
    'native japanese',
    'business japanese',
    'ビジネスレベル日本語必須',
    'ビジネス日本語',
    '法人営業経験',
    'infrastructure',
    'インフラ',
    'サーバー',
    'backend-heavy',
    'バックエンド専門',
    'java必須',
    'php必須',
    '運転免許必須',
    'kubernetes',
    'sre',
    'devops',
    'on-call',
    'シニア',
  ]

  const matchedHigh: string[] = []
  const matchedLow: string[] = []

  function collectMatches(source: string[], label: string) {
    const hits: string[] = []
    for (const k of source) {
      if (jobText.includes(k)) {
        hits.push(k)
        matchedHigh.push(k)
      }
    }
    return uniq(hits)
  }

  const hospitalityHits = collectMatches(hospitalityKeywords, 'hospitality')
  const languageHits = collectMatches(languageKeywords, 'language')
  const snsPrHits = collectMatches(snsPrKeywords, 'snspr')
  const cafeServiceHits = collectMatches(cafeServiceKeywords, 'cafe')
  const juniorHits = collectMatches(juniorFriendlyKeywords, 'junior')
  const webFrontendHits = collectMatches(webFrontendKeywords, 'web')

  for (const k of lowFitKeywords) {
    if (jobText.includes(normalize(k))) matchedLow.push(k)
  }

  const strengths: string[] = []
  const gaps: string[] = []

  const profileSignals = [
    ...hospitalityKeywords,
    ...languageKeywords,
    ...snsPrKeywords,
    ...cafeServiceKeywords,
    ...juniorFriendlyKeywords,
    ...webFrontendKeywords,
  ].filter((k) => profileText.includes(k))

  const hasProfileHospitality = hospitalityHits.some((k) =>
    profileSignals.includes(k)
  )
  const hasProfileLanguage = languageHits.some((k) =>
    profileSignals.includes(k)
  )
  const hasProfileWeb = webFrontendHits.some((k) =>
    profileSignals.includes(k)
  )

  if (hospitalityHits.length > 0) {
    strengths.push(
      hasProfileHospitality
        ? '職缺與你的個人檔案皆出現飯店、前台、接待或住宿相關訊號，與旅宿服務求職方向高度吻合。'
        : '職缺中出現飯店、前台、接待或住宿相關訊號，符合你的旅宿服務求職方向。'
    )
  }

  if (languageHits.length > 0) {
    strengths.push(
      hasProfileLanguage
        ? '職缺語言或外國旅客對應需求，與你個人檔案中的多語溝通背景相符。'
        : '職缺內容包含語言或外國旅客對應相關訊號，可凸顯你的中文、日文與英文溝通能力。'
    )
  }

  if (snsPrHits.length > 0) {
    strengths.push(
      'SNS、活動、社群或宣傳相關內容可連結你的內容製作與活動支援經驗。'
    )
  }

  if (cafeServiceHits.length > 0) {
    strengths.push('職缺出現餐飲、咖啡廳或接客販售等面向客人的服務工作訊號。')
  }

  if (juniorHits.length > 0) {
    strengths.push(
      '職缺有未經驗可、研修或入門友善訊號，適合作為日本就職初期的切入點。'
    )
  }

  if (webFrontendHits.length > 0) {
    strengths.push(
      hasProfileWeb
        ? 'Web、前端或 AI 相關關鍵字與你目前的專案與學習方向相符。'
        : '職缺提及 Web、前端或 AI 相關技能，可連結你的技術學習與作品集。'
    )
  }

  if (
    includesAny(jobText, [
      'senior',
      'lead',
      'manager',
      '店長',
      '支配人',
      'マネージャー',
      '責任者',
      'リーダー経験必須',
      'シニア',
    ])
  ) {
    gaps.push('若職缺偏管理職或要求領導經驗，可能不適合作為初期切入職位。')
  }

  if (includesAny(jobText, ['夜勤', 'ナイトフロント'])) {
    gaps.push('若職缺包含夜勤，需確認體力、排班與生活作息是否能長期配合。')
  }

  let score = 48

  // Hospitality is a strong target direction
  if (hospitalityHits.length > 0) {
    score += 14
  }

  // Language / inbound guests
  if (languageHits.length > 0) {
    score += 10
  }

  // SNS / PR / events
  if (snsPrHits.length > 0) {
    score += 6
  }

  // Cafe / service work
  if (cafeServiceHits.length > 0) {
    score += 4
  }

  // Junior-friendly
  if (juniorHits.length > 0) {
    score += 8
  }

  // Web / frontend / AI roles
  if (webFrontendHits.length > 0) {
    score += 6
  }

  // Penalize low-fit / senior-only signals, but per category, not per occurrence
  if (
    includesAny(jobText, [
      'senior',
      'lead',
      'manager',
      '店長',
      '支配人',
      'マネージャー',
      'シニア',
    ])
  ) {
    score -= 10
  }

  if (
    includesAny(jobText, [
      '実務経験3年以上',
      '実務経験５年以上',
      '実務経験5年以上',
      '実務経験７年以上',
      '実務経験7年以上',
      '5+ years',
      '7+ years',
      '10+ years',
      'years of experience',
      '実務経験',
    ])
  ) {
    score -= 8
    gaps.push('職缺可能要求較多年實務經驗，需評估是否符合你目前的職涯階段。')
  }

  if (
    includesAny(jobText, [
      'ネイティブレベル',
      'native japanese',
      'ビジネスレベル日本語必須',
      'ビジネス日本語',
    ])
  ) {
    score -= 6
    gaps.push('若職缺要求較高商務日文，建議準備具體情境說明目前日文使用能力。')
  }

  if (
    includesAny(jobText, [
      'インフラ',
      'infrastructure',
      'サーバー',
      'backend-heavy',
      'バックエンド専門',
      'java必須',
      'php必須',
    ])
  ) {
    score -= 6
    gaps.push('職缺偏後端、基礎建設或特定技術堆疊，可能與你目前的前端／接客主軸不完全一致。')
  }

  if (matchedLow.length > 0 && gaps.length === 0) {
    gaps.push('職缺出現部分需留意的條件訊號，建議仔細確認資格與工作內容後再決定是否投遞。')
  }

  if (includesAny(jobText, ['ビザ', 'visa', 'sponsor', 'sponsorship'])) {
    strengths.push('職缺提及簽證或簽證支援相關內容，建議事先確認資格與細節。')
  }

  score = clampScore(score)

  const recommendedAction: RecommendedAction =
    score >= 75 ? 'apply' : score >= 45 ? 'maybe' : 'skip'

  const requiredSkills = uniq([
    ...(hospitalityHits.length > 0
      ? ['接客服務', '基本日文溝通', '前台／受付支援', '顧客問題處理']
      : []),
    ...(includesAny(jobText, ['夜勤', 'ナイトフロント'])
      ? ['夜勤與排班配合']
      : []),
    ...(languageHits.length > 0 ? ['語言溝通與外國旅客對應'] : []),
    ...(cafeServiceHits.length > 0 ? ['餐飲或店面接客能力'] : []),
    ...(webFrontendHits.length > 0 ? ['基礎 Web／前端理解'] : []),
  ])

  const bonusSkills = uniq([
    ...(languageHits.length > 0
      ? ['中文／英文對應', '外國旅客支援', '跨文化溝通']
      : []),
    ...(snsPrHits.length > 0
      ? ['SNS 或宣傳內容製作', 'Canva、攝影或活動支援']
      : []),
    ...(cafeServiceHits.length > 0 ? ['餐飲現場服務經驗'] : []),
    ...(webFrontendHits.length > 0 ? ['React／Next.js 等前端技能', 'AI 輔助開發經驗'] : []),
  ])

  const resumeAdvice: string[] = []
  if (hospitalityHits.length > 0) {
    resumeAdvice.push(
      '履歷中建議強調飯店、餐飲、接客或顧客服務經驗，並具體寫出你如何處理客人需求。'
    )
    if (includesAny(jobText, ['夜勤', 'ナイトフロント'])) {
      resumeAdvice.push(
        '若投遞夜勤前台，建議補充可靠度、守時、問題處理與獨立作業能力。'
      )
    }
  }
  if (languageHits.length > 0) {
    resumeAdvice.push(
      '可以把中文母語、日文 N2 學習背景與英文溝通能力整理成「可支援外國旅客」的賣點。'
    )
  }
  if (snsPrHits.length > 0) {
    resumeAdvice.push(
      '若職缺提到 SNS 或活動，建議補充 Canva、攝影、社群經營或活動支援經驗。'
    )
  }
  if (webFrontendHits.length > 0) {
    resumeAdvice.push(
      '可將 JobFit-AI 等專案寫成作品集，說明你實作的功能與使用的技術（React／Next.js／TypeScript）。'
    )
  }
  if (resumeAdvice.length === 0) {
    resumeAdvice.push(
      '建議依職缺主要工作內容調整履歷，並用 1～2 個具體案例連結你的過往經驗。'
    )
  }

  const interviewPrep: string[] = []
  if (
    hospitalityHits.length > 0 ||
    includesAny(jobText, ['reception', 'front desk', 'hotel', 'guesthouse', 'hostel'])
  ) {
    interviewPrep.push(
      '準備一個接待客人、處理詢問或解決突發狀況的具體案例（例如入住、退房或現場問題）。'
    )
  }
  if (includesAny(jobText, ['夜勤', 'ナイトフロント'])) {
    interviewPrep.push(
      '如果是夜勤職缺，準備說明你如何適應夜班、維持穩定出勤與處理夜間突發狀況。'
    )
  }
  if (
    languageHits.length > 0 ||
    includesAny(jobText, ['multilingual', 'chinese', 'japanese', 'english', '中国語', '英語', '日本語'])
  ) {
    interviewPrep.push(
      '準備用日文說明你的自我介紹、可工作時間、簽證狀態與來日本工作的動機。'
    )
    interviewPrep.push('準備說明你如何用中文或英文協助外國旅客。')
  }
  if (snsPrHits.length > 0) {
    interviewPrep.push(
      '準備分享你曾協助的 SNS 貼文、活動或宣傳案例，以及實際成果或學到的事。'
    )
  }
  if (webFrontendHits.length > 0) {
    interviewPrep.push(
      '準備說明你在 JobFit-AI 或其他專案中實作過的一個功能，以及它解決了什麼問題。'
    )
  }
  if (interviewPrep.length === 0) {
    interviewPrep.push(
      '先閱讀職缺主要職責，準備 2～3 個能證明你能勝任類似工作的具體故事。'
    )
  }

  const highFitCategoryLabels: string[] = []
  if (hospitalityHits.length > 0) highFitCategoryLabels.push('旅宿／前台接待')
  if (languageHits.length > 0) highFitCategoryLabels.push('語言能力')
  if (snsPrHits.length > 0) highFitCategoryLabels.push('SNS／活動宣傳')
  if (cafeServiceHits.length > 0) highFitCategoryLabels.push('餐飲／接客服務')
  if (juniorHits.length > 0) highFitCategoryLabels.push('入門友善')
  if (webFrontendHits.length > 0) highFitCategoryLabels.push('Web／前端／AI')

  const actionZh = recommendedActionLabel(recommendedAction)
  let summary: string
  if (highFitCategoryLabels.length > 0) {
    summary = `本次以本地規則進行初步分析（v1）。適合度分數為 ${score} 分。這份職缺與你的${highFitCategoryLabels.join('、')}等方向有明顯相關，因此目前判定為「${actionZh}」。`
  } else {
    summary = `本次以本地規則進行初步分析（v1）。適合度分數為 ${score} 分，目前判定為「${actionZh}」。建議再仔細閱讀職缺內容後決定是否投遞。`
  }
  if (gaps.length > 0) {
    summary += ` 同時請留意可能落差：${gaps[0]}`
  }

  return {
    jobId: job.id,
    source: 'local-placeholder',
    analysisVersion: 1,
    fitScore: score,
    recommendedAction,
    summary,
    strengths: uniq(strengths).slice(0, 12),
    gaps: uniq(gaps).slice(0, 12),
    requiredSkills: requiredSkills.slice(0, 12),
    bonusSkills: bonusSkills.slice(0, 12),
    resumeAdvice: uniq(resumeAdvice).slice(0, 8),
    interviewPrep: uniq(interviewPrep).slice(0, 8),
    metadata: {
      jobTitle,
      company,
      profileVersion,
    },
  }
}

export async function POST(_request: Request, context: Params) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'Missing job id' },
        {
          status: 400,
        }
      )
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

    let profile: UserProfile
    try {
      profile = await readJsonFile<UserProfile>(profileFilePath, 'user_profile.json')
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }

    const result = makeAnalysis(job, profile)
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

