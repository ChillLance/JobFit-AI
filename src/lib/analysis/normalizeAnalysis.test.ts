import { describe, expect, it } from 'vitest'
import {
  getFitLevel,
  getFitLevelLabel,
  getPrimaryAnalysis,
  normalizeAnalysisResult,
} from './normalizeAnalysis'

describe('getFitLevel', () => {
  it('maps scores to the documented thresholds', () => {
    expect(getFitLevel(90)).toBe('excellent')
    expect(getFitLevel(85)).toBe('excellent')
    expect(getFitLevel(70)).toBe('good')
    expect(getFitLevel(50)).toBe('fair')
    expect(getFitLevel(49)).toBe('poor')
    expect(getFitLevel(null)).toBe('unknown')
    expect(getFitLevel(undefined)).toBe('unknown')
  })

  it('has a label for every level', () => {
    for (const level of ['excellent', 'good', 'fair', 'poor', 'unknown'] as const) {
      expect(getFitLevelLabel(level)).toBeTruthy()
    }
  })
})

describe('normalizeAnalysisResult', () => {
  it('maps differing provider field names onto the unified shape', () => {
    const result = normalizeAnalysisResult(
      {
        score: 82, // legacy alias for fitScore
        level: 'good', // legacy alias for fitLevel
        recommendedAction: 'apply', // maps to a recommendation label
        weaknesses: ['needs more Japanese practice'], // legacy alias for gaps
        riskFactors: ['night shifts'], // legacy alias for risks
      },
      'gemini',
      'fallback-model'
    )

    expect(result.fitScore).toBe(82)
    expect(result.fitLevel).toBe('good')
    expect(result.recommendation).toBe('建議投遞')
    expect(result.gaps).toEqual(['needs more Japanese practice'])
    expect(result.risks).toEqual(['night shifts'])
    expect(result.metadata.provider).toBe('gemini')
    expect(result.metadata.model).toBe('fallback-model')
  })

  it('falls back to a derived fitLevel when the raw object has none', () => {
    const result = normalizeAnalysisResult({ fitScore: 91 }, 'local', 'local-rules-v1')
    expect(result.fitLevel).toBe('excellent')
  })

  it('never throws on garbage input', () => {
    expect(() => normalizeAnalysisResult(null, 'local', 'x')).not.toThrow()
    expect(() => normalizeAnalysisResult('not an object', 'local', 'x')).not.toThrow()
    const result = normalizeAnalysisResult(undefined, 'local', 'x')
    expect(result.fitScore).toBeNull()
    expect(result.fitLevel).toBe('unknown')
  })
})

describe('getPrimaryAnalysis', () => {
  it('prioritizes gemini > groq > openrouter > local', () => {
    const job = {
      deepAnalysis: { fitScore: 10 },
      groqAnalysis: { fitScore: 20 },
      openrouterAnalysis: { fitScore: 30 },
      localAnalysis: { fitScore: 40 },
    }
    expect(getPrimaryAnalysis(job)?.fitScore).toBe(10)
    expect(getPrimaryAnalysis({ ...job, deepAnalysis: undefined })?.fitScore).toBe(20)
    expect(
      getPrimaryAnalysis({ ...job, deepAnalysis: undefined, groqAnalysis: undefined })
        ?.fitScore
    ).toBe(30)
  })

  it('resolves the local source as localAnalysis ?? analysis ?? aiScore', () => {
    expect(getPrimaryAnalysis({ analysis: { fitScore: 55 } })?.fitScore).toBe(55)
    expect(getPrimaryAnalysis({ aiScore: { fitScore: 66 } })?.fitScore).toBe(66)
    expect(
      getPrimaryAnalysis({ localAnalysis: { fitScore: 77 }, analysis: { fitScore: 55 } })
        ?.fitScore
    ).toBe(77)
  })

  it('returns null when nothing is analyzed', () => {
    expect(getPrimaryAnalysis({})).toBeNull()
  })
})
