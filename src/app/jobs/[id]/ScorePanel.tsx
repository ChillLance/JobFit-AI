'use client'

import { useState } from 'react'

type ScoreResult = {
  score: number
  level: string
  summary: string
  strengths: string[]
  concerns: string[]
  requiredSkills: string[]
  bonusSkills: string[]
  applicationAdvice: string[]
  generatedAt?: string
}

type ScoreApiResponse = {
  success: boolean
  jobId?: string
  generatedAt?: string
  result?: ScoreResult
  error?: string
}

async function readJsonSafely(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`API 回傳不是合法 JSON：${text}`)
  }
}

function AnalysisList({
  title,
  items,
  color,
}: {
  title: string
  items: string[]
  color: 'green' | 'yellow' | 'blue' | 'purple'
}) {
  const colorClassMap = {
    green: 'border-green-800 bg-green-950/20 text-green-300',
    yellow: 'border-yellow-800 bg-yellow-950/20 text-yellow-300',
    blue: 'border-blue-800 bg-blue-950/20 text-blue-300',
    purple: 'border-purple-800 bg-purple-950/20 text-purple-300',
  }

  return (
    <div className={`rounded-xl border p-5 ${colorClassMap[color]}`}>
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ScorePanel({
  jobId,
  initialScore,
}: {
  jobId: string
  initialScore: ScoreResult | null
}) {
  const [result, setResult] = useState<ScoreResult | null>(initialScore)
  const [generatedAt, setGeneratedAt] = useState<string | null>(
    initialScore?.generatedAt || null
  )

  const [error, setError] = useState<string | null>(null)
  const [isScoring, setIsScoring] = useState(false)

  async function handleScore() {
    try {
      setIsScoring(true)
      setError(null)

      const response = await fetch(
        `/api/jobs/${encodeURIComponent(jobId)}/score`,
        {
          method: 'POST',
        }
      )

      const data = (await readJsonSafely(response)) as ScoreApiResponse | null

      if (!response.ok) {
        throw new Error(data?.error || 'AI 評分失敗')
      }

      if (!data?.result) {
        throw new Error('API 沒有回傳評分結果')
      }

      setResult(data.result)
      setGeneratedAt(data.result.generatedAt || data.generatedAt || null)
    } catch (error) {
      console.error('AI 評分失敗:', error)
      setError(error instanceof Error ? error.message : 'AI 評分失敗')
    } finally {
      setIsScoring(false)
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">AI 分析區</h2>
          <p className="mt-1 text-sm text-slate-400">
            目前是 Mock 版評分，之後可以替換成 Gemini 或 OpenAI。
          </p>
        </div>

        <button
          type="button"
          onClick={handleScore}
          disabled={isScoring}
          className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isScoring ? 'AI 評分中...' : result ? '重新 AI 評分' : 'AI 評分'}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-700 bg-red-950/50 p-4 text-sm text-red-100">
          <p className="font-bold">AI 評分失敗</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!result ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 text-sm leading-7 text-slate-400">
          尚未產生 AI 分析。點擊右上角的「AI 評分」即可產生 Mock 分析結果。
          <br />
          <span className="font-mono text-slate-300">
            POST /api/jobs/[id]/score
          </span>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-purple-700/50 bg-purple-950/30 p-5">
            <p className="text-sm text-purple-200">適合度分數</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <p className="text-5xl font-bold text-white">{result.score}</p>
              <p className="pb-2 text-lg font-semibold text-purple-200">
                / 100，{result.level}
              </p>
            </div>

            {generatedAt && (
              <p className="mt-3 text-xs text-slate-400">
                產生時間：{new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <h3 className="font-bold text-slate-100">職缺摘要</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {result.summary}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <AnalysisList
              title="適合你的地方"
              items={result.strengths}
              color="green"
            />

            <AnalysisList
              title="需要注意的地方"
              items={result.concerns}
              color="yellow"
            />

            <AnalysisList
              title="必要技能"
              items={result.requiredSkills}
              color="blue"
            />

            <AnalysisList
              title="加分技能"
              items={result.bonusSkills}
              color="purple"
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <h3 className="font-bold text-slate-100">應徵建議</h3>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
              {result.applicationAdvice.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-blue-400">{index + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

