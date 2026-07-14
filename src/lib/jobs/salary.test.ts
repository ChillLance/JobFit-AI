import { describe, expect, it } from 'vitest'
import { getJobSalaryEstimate, parseSalaryText } from './salary'

describe('parseSalaryText', () => {
  it('parses 時給 and normalizes to monthly (×160h)', () => {
    expect(parseSalaryText('時給 1,150円（22時以降 1,438円）')).toEqual({
      monthlyJpy: 1150 * 160,
      period: 'hourly',
    })
  })

  it('parses 日給 and normalizes to monthly (×22 days)', () => {
    expect(parseSalaryText('日給 11,000円 + 交通費')).toEqual({
      monthlyJpy: 11000 * 22,
      period: 'daily',
    })
  })

  it('parses 月給 with a range, taking the lower bound', () => {
    expect(parseSalaryText('月給 210,000円〜260,000円')).toEqual({
      monthlyJpy: 210000,
      period: 'monthly',
    })
  })

  it('parses 月収 and 月額 as monthly too', () => {
    expect(parseSalaryText('月収25万円以上可')?.monthlyJpy).toBe(250000)
    expect(parseSalaryText('月額 300,000円')?.monthlyJpy).toBe(300000)
  })

  it('parses 年収 with 万 shorthand and divides by 12', () => {
    expect(parseSalaryText('年収 400万〜550万円')).toEqual({
      monthlyJpy: Math.round(4000000 / 12),
      period: 'annual',
    })
  })

  it('rejects implausible amounts instead of mis-sorting', () => {
    // Looks like a period keyword but the number is a year, not pay.
    expect(parseSalaryText('時給は2026年に改定予定')).toBeNull()
    expect(parseSalaryText('')).toBeNull()
    expect(parseSalaryText('要相談')).toBeNull()
  })
})

describe('getJobSalaryEstimate', () => {
  it('prefers the structured salary field over rawText', () => {
    const estimate = getJobSalaryEstimate({
      salary: '月給 235,000円〜',
      rawText: '時給1,000円のアルバイトも併設',
    })
    expect(estimate).toEqual({ monthlyJpy: 235000, period: 'monthly' })
  })

  it('falls back to rawText when salary is missing', () => {
    const estimate = getJobSalaryEstimate({
      rawText: '待遇：時給 1,200円、交通費支給',
    })
    expect(estimate).toEqual({ monthlyJpy: 1200 * 160, period: 'hourly' })
  })

  it('returns null when nothing is parseable', () => {
    expect(getJobSalaryEstimate({})).toBeNull()
    expect(getJobSalaryEstimate({ rawText: '給与は面談にて' })).toBeNull()
  })
})
