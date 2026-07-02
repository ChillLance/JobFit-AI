import { describe, expect, it } from 'vitest'
import {
  getDashboardStats,
  getJobDate,
  isAppliedStatus,
  isInterviewingStatus,
  type DashboardJob,
} from './getDashboardStats'

describe('status helpers', () => {
  it('recognize the enum value and the legacy Chinese label', () => {
    expect(isAppliedStatus('applied')).toBe(true)
    expect(isAppliedStatus('已投遞')).toBe(true)
    expect(isAppliedStatus('interview')).toBe(false)

    expect(isInterviewingStatus('interview')).toBe(true)
    expect(isInterviewingStatus('interviewing')).toBe(true)
    expect(isInterviewingStatus('面試中')).toBe(true)
    expect(isInterviewingStatus('applied')).toBe(false)
  })
})

describe('getJobDate', () => {
  it('picks the first parseable date from the candidate fields', () => {
    expect(getJobDate({ collectedAt: '2026-01-05T00:00:00.000Z' })).toBe(
      new Date('2026-01-05T00:00:00.000Z').getTime()
    )
    expect(getJobDate({ createdAt: 'not a date', collectedAt: '2026-01-05T00:00:00.000Z' })).toBe(
      new Date('2026-01-05T00:00:00.000Z').getTime()
    )
    expect(getJobDate({})).toBeNull()
  })
})

describe('getDashboardStats', () => {
  const now = Date.now()
  const recent = new Date(now - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  const old = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago

  const jobs: DashboardJob[] = [
    { localAnalysis: { fitScore: 90 }, status: 'applied', collectedAt: recent },
    { localAnalysis: { fitScore: 60 }, status: 'interview', collectedAt: old },
    { collectedAt: recent }, // unanalyzed
  ]

  it('aggregates totals, high match, applied/interviewing counts', () => {
    const stats = getDashboardStats(jobs)
    expect(stats.totalJobs).toBe(3)
    expect(stats.highMatchJobs).toBe(1) // only the 90-score job clears 80
    expect(stats.appliedJobs).toBe(1)
    expect(stats.interviewingJobs).toBe(1)
    expect(stats.unanalyzedJobs).toBe(1)
    expect(stats.averageScore).toBe(75) // (90 + 60) / 2
    expect(stats.recentJobs).toBe(2) // within the last 7 days
  })

  it('returns all zeros / nulls for an empty list', () => {
    const stats = getDashboardStats([])
    expect(stats.totalJobs).toBe(0)
    expect(stats.averageScore).toBeNull()
  })
})
