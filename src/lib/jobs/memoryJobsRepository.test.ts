import { describe, expect, it } from 'vitest'
import { createMemoryJobsRepository } from './memoryJobsRepository'
import type { Job } from '@/types/domain'

function job(id: string, overrides: Partial<Job> = {}): Job {
  return { id, title: `Job ${id}`, ...overrides }
}

describe('memoryJobsRepository (DEMO_MODE)', () => {
  it('seeds from the constructor argument, newest-first as given', () => {
    const repo = createMemoryJobsRepository([job('a'), job('b')])
    expect(repo.readJobs().map((j) => j.id)).toEqual(['a', 'b'])
  })

  it('defaults to an empty store when no seed is given', () => {
    expect(createMemoryJobsRepository().readJobs()).toEqual([])
  })

  it('prependJob inserts newest-first', () => {
    const repo = createMemoryJobsRepository()
    repo.prependJob(job('a'))
    repo.prependJob(job('b'))
    repo.prependJob(job('c'))
    expect(repo.readJobs().map((j) => j.id)).toEqual(['c', 'b', 'a'])
  })

  it('findJob returns the job or undefined', () => {
    const repo = createMemoryJobsRepository([job('a', { title: 'Alpha' })])
    expect(repo.findJob('a')?.title).toBe('Alpha')
    expect(repo.findJob('missing')).toBeUndefined()
  })

  it('updateJob merges a patch (upsert-in-place) and preserves position', () => {
    const repo = createMemoryJobsRepository([job('c'), job('b'), job('a')])
    const updated = repo.updateJob('b', { status: 'applied' })
    expect(updated?.status).toBe('applied')
    expect(updated?.title).toBe('Job b')
    expect(repo.readJobs().map((j) => j.id)).toEqual(['c', 'b', 'a'])
  })

  it('updateJob returns null for a missing id', () => {
    const repo = createMemoryJobsRepository()
    expect(repo.updateJob('missing', { status: 'applied' })).toBeNull()
  })

  it('deleteJob removes the entry and reports the remaining count', () => {
    const repo = createMemoryJobsRepository([job('a'), job('b')])
    expect(repo.deleteJob('a')).toEqual({ remaining: 1 })
    expect(repo.readJobs().map((j) => j.id)).toEqual(['b'])
    expect(repo.deleteJob('a')).toBeNull() // already gone
  })

  it('writeJobs replaces the whole store, preserving the given order', () => {
    const repo = createMemoryJobsRepository([job('old')])
    repo.writeJobs([job('newest'), job('middle'), job('oldest')])
    expect(repo.readJobs().map((j) => j.id)).toEqual([
      'newest',
      'middle',
      'oldest',
    ])
  })

  it('readJobs returns a defensive copy (mutating the result does not affect the store)', () => {
    const repo = createMemoryJobsRepository([job('a')])
    const first = repo.readJobs()
    first.push(job('b'))
    expect(repo.readJobs().map((j) => j.id)).toEqual(['a'])
  })
})
