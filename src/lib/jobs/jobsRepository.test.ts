import { describe, expect, it } from 'vitest'
import { createDatabase } from './db'
import { createJobsRepository } from './jobsRepository'
import type { Job } from '@/types/domain'

// Isolated in-memory database per test — never touches the real
// data/jobfit.sqlite file.
function makeRepo() {
  return createJobsRepository(createDatabase(':memory:'))
}

function job(id: string, overrides: Partial<Job> = {}): Job {
  return { id, title: `Job ${id}`, ...overrides }
}

describe('jobsRepository (SQLite)', () => {
  it('readJobs returns an empty array for a fresh database', () => {
    expect(makeRepo().readJobs()).toEqual([])
  })

  it('prependJob inserts newest-first', () => {
    const repo = makeRepo()
    repo.prependJob(job('a'))
    repo.prependJob(job('b'))
    repo.prependJob(job('c'))
    expect(repo.readJobs().map((j) => j.id)).toEqual(['c', 'b', 'a'])
  })

  it('findJob returns the job or undefined', () => {
    const repo = makeRepo()
    repo.prependJob(job('a', { title: 'Alpha' }))
    expect(repo.findJob('a')?.title).toBe('Alpha')
    expect(repo.findJob('missing')).toBeUndefined()
  })

  it('updateJob merges a patch and preserves position', () => {
    const repo = makeRepo()
    repo.prependJob(job('a'))
    repo.prependJob(job('b'))
    repo.prependJob(job('c'))

    const updated = repo.updateJob('b', { status: 'applied' })
    expect(updated?.status).toBe('applied')
    expect(updated?.title).toBe('Job b') // untouched fields survive the merge

    // Order is unchanged by an in-place update.
    expect(repo.readJobs().map((j) => j.id)).toEqual(['c', 'b', 'a'])
  })

  it('updateJob returns null for a missing id', () => {
    expect(makeRepo().updateJob('missing', { status: 'applied' })).toBeNull()
  })

  it('deleteJob removes the row and reports the remaining count', () => {
    const repo = makeRepo()
    repo.prependJob(job('a'))
    repo.prependJob(job('b'))

    expect(repo.deleteJob('a')).toEqual({ remaining: 1 })
    expect(repo.readJobs().map((j) => j.id)).toEqual(['b'])
    expect(repo.deleteJob('a')).toBeNull() // already gone
  })

  it('writeJobs replaces the whole table while keeping newest-first order', () => {
    const repo = makeRepo()
    repo.writeJobs([job('newest'), job('middle'), job('oldest')])
    expect(repo.readJobs().map((j) => j.id)).toEqual([
      'newest',
      'middle',
      'oldest',
    ])
  })
})
