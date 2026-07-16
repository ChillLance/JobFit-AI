import { describe, expect, it } from 'vitest'
import { buildDemoJobs } from './demoSeed'

describe('demoSeed (DEMO_MODE)', () => {
  it('returns the 7 demo jobs, each with a localAnalysis result attached', () => {
    const jobs = buildDemoJobs()
    expect(jobs).toHaveLength(7)
    for (const job of jobs) {
      expect(job.localAnalysis).toBeTruthy()
      expect(
        (job.localAnalysis as { fitScore?: number } | undefined)?.fitScore
      ).toEqual(expect.any(Number))
    }
  })

  it('does not mutate the same object across calls (fresh copies each time)', () => {
    const first = buildDemoJobs()
    first[0].status = 'applied'
    const second = buildDemoJobs()
    expect(second[0].status).not.toBe('applied')
  })

  it('preserves the hand-authored extraction field on jobs that have one', () => {
    const jobs = buildDemoJobs()
    const withExtraction = jobs.filter(
      (job) => (job as unknown as { extraction?: unknown }).extraction
    )
    expect(withExtraction.length).toBeGreaterThanOrEqual(4)
  })
})
