import { describe, expect, it } from 'vitest'
import { buildExtractionPrompt } from './buildExtractionPrompt'

describe('buildExtractionPrompt', () => {
  const input = {
    title: 'ホテルフロントスタッフ募集（住み込み）',
    url: 'https://example.com/jobs/synthetic-001',
    rawText: '時給1,300円、寮費無料、外国人歓迎。',
  }

  it('interpolates title, url and rawText verbatim into the prompt', () => {
    const prompt = buildExtractionPrompt(input)
    expect(prompt).toContain(input.title)
    expect(prompt).toContain(input.url)
    expect(prompt).toContain(input.rawText)
  })

  it('instructs JSON-only output with no markdown fences', () => {
    const prompt = buildExtractionPrompt(input)
    expect(prompt).toMatch(/Output ONLY\s+valid JSON/)
    expect(prompt).toContain('No prose, no markdown fences')
  })

  it('lists every classification field as quote-exempt', () => {
    const prompt = buildExtractionPrompt(input)
    for (const field of [
      'roleCategory',
      'employmentType',
      'wageType',
      'mealsCostType',
      'travelReimbursement',
      'housingType',
      'shiftType',
    ]) {
      expect(prompt).toContain(field)
    }
  })

  it('includes the full output schema key list (spot-checked keys)', () => {
    const prompt = buildExtractionPrompt(input)
    for (const key of [
      'workplaceName',
      'wageMinJpy',
      'dormFeeJpy',
      'requiredLanguages',
      'incomeExamples',
      'redFlags',
      'evidence',
    ]) {
      expect(prompt).toContain(`"${key}"`)
    }
  })

  it('does not truncate rawText (v1 has no truncation logic)', () => {
    const longRawText = '住み込み求人。'.repeat(500)
    const prompt = buildExtractionPrompt({ ...input, rawText: longRawText })
    expect(prompt).toContain(longRawText)
  })
})
