import { describe, expect, it } from 'vitest'
import { createDatabase } from '@/lib/jobs/db'
import { createJobsRepository, type JobsRepository } from '@/lib/jobs/jobsRepository'
import { normalizeJobUrl } from '@/lib/jobs/normalizeJobUrl'
import type { Job } from '@/types/domain'
import type { JobExtraction } from '@/types/extraction'
import { hashRawText } from './parseExtraction'

// These tests exercise the same upsert-by-URL algorithm used by
// src/app/api/collect/route.ts, against an isolated in-memory repository
// (never the real data/jobfit.sqlite file). The Next.js route handler
// itself is not imported here — it's bound to the singleton repository, so
// importing it directly in a test would touch real on-disk data.

type JobWithExtraction = Job & { extraction?: JobExtraction }

function makeRepo(): JobsRepository {
  return createJobsRepository(createDatabase(':memory:'))
}

function fakeExtraction(rawTextHash: string): JobExtraction {
  return {
    schemaVersion: 1,
    extractedAt: '2026-07-14T00:00:00.000Z',
    model: 'test-model',
    rawTextHash,
    workplaceName: null,
    agencyName: null,
    listingId: null,
    roleCategory: null,
    dutySummary: null,
    employmentType: null,
    startTiming: null,
    minDurationMonths: null,
    durationNote: null,
    extensionPossible: null,
    requiredLanguages: [],
    requiredLicenses: [],
    requiredExperience: null,
    foreignerSignals: [],
    wageType: null,
    wageMinJpy: null,
    wageMaxJpy: null,
    overtimeNote: null,
    statedMonthlyIncomeJpy: null,
    incomeExamples: [],
    dormFeeJpy: null,
    dormFeeNote: null,
    utilitiesFeeJpy: null,
    utilitiesFeeNote: null,
    mealsCostType: null,
    mealsCostNote: null,
    travelReimbursement: null,
    travelReimbursementCapJpy: null,
    travelReimbursementCondition: null,
    payDay: null,
    advancePayAvailable: null,
    completionBonusNote: null,
    housingType: null,
    housingWifi: null,
    housingNote: null,
    mealsProvidedNote: null,
    prefecture: null,
    cityArea: null,
    areaName: null,
    accessNote: null,
    carAllowed: null,
    onsenUse: null,
    shiftType: null,
    hoursNote: null,
    nightWork: null,
    overtimeEstimate: null,
    holidaysPerMonthNote: null,
    trainingSupport: null,
    sourceRatingScore: null,
    sourceRatingCount: null,
    redFlags: [],
    evidence: {},
  }
}

// Mirrors the upsert-by-URL logic in src/app/api/collect/route.ts: find a
// non-demo job with the same url; update it in place (clearing a stale
// extraction) instead of inserting a duplicate.
function collectUpsert(
  repo: JobsRepository,
  incoming: { url: string; title: string; rawText: string; collectedAt: string }
): Job {
  const incomingNormalizedUrl = normalizeJobUrl(incoming.url)
  const existing = repo
    .readJobs()
    .find(
      (job) =>
        normalizeJobUrl(job.url ?? '') === incomingNormalizedUrl && job.source !== 'demo'
    )

  if (existing) {
    const patch: Partial<Job> & { extraction?: JobExtraction } = {
      title: incoming.title,
      rawText: incoming.rawText,
      collectedAt: incoming.collectedAt,
    }
    const existingExtraction = (existing as JobWithExtraction).extraction
    if (existingExtraction && existingExtraction.rawTextHash !== hashRawText(incoming.rawText)) {
      patch.extraction = undefined
    }
    return repo.updateJob(existing.id, patch)!
  }

  const newJob: Job = {
    id: crypto.randomUUID(),
    title: incoming.title,
    url: incoming.url,
    rawText: incoming.rawText,
    collectedAt: incoming.collectedAt,
  }
  repo.prependJob(newJob)
  return newJob
}

describe('collect upsert-by-URL (design doc §9)', () => {
  it('(f) updates the existing non-demo job in place instead of inserting a duplicate', () => {
    const repo = makeRepo()
    repo.prependJob({
      id: 'job-1',
      title: 'Old title',
      url: 'https://example.com/jobs/1',
      rawText: '古い求人テキスト',
      collectedAt: '2026-07-01T00:00:00.000Z',
    })

    collectUpsert(repo, {
      url: 'https://example.com/jobs/1',
      title: 'New title',
      rawText: '新しい求人テキスト',
      collectedAt: '2026-07-14T00:00:00.000Z',
    })

    const jobs = repo.readJobs()
    expect(jobs).toHaveLength(1) // no duplicate row inserted
    expect(jobs[0].id).toBe('job-1')
    expect(jobs[0].title).toBe('New title')
    expect(jobs[0].rawText).toBe('新しい求人テキスト')
    expect(jobs[0].collectedAt).toBe('2026-07-14T00:00:00.000Z')
  })

  it('clears a stale extraction when rawText (and thus its hash) changes', () => {
    const repo = makeRepo()
    const oldRawText = '古い求人テキスト'
    repo.prependJob({
      id: 'job-2',
      title: 'Old title',
      url: 'https://example.com/jobs/2',
      rawText: oldRawText,
      collectedAt: '2026-07-01T00:00:00.000Z',
      extraction: fakeExtraction(hashRawText(oldRawText)),
    } as Job)

    collectUpsert(repo, {
      url: 'https://example.com/jobs/2',
      title: 'Old title',
      rawText: '新しい求人テキスト（内容が変わった）',
      collectedAt: '2026-07-14T00:00:00.000Z',
    })

    const updated = repo.findJob('job-2') as JobWithExtraction | undefined
    expect(updated?.extraction).toBeUndefined()
  })

  it('preserves the extraction when rawText is unchanged (hash matches)', () => {
    const repo = makeRepo()
    const rawText = '変わらない求人テキスト'
    const extraction = fakeExtraction(hashRawText(rawText))
    repo.prependJob({
      id: 'job-3',
      title: 'Same title',
      url: 'https://example.com/jobs/3',
      rawText,
      collectedAt: '2026-07-01T00:00:00.000Z',
      extraction,
    } as Job)

    // Re-collected with identical rawText (e.g. user revisits the page).
    collectUpsert(repo, {
      url: 'https://example.com/jobs/3',
      title: 'Same title',
      rawText,
      collectedAt: '2026-07-14T00:00:00.000Z',
    })

    const updated = repo.findJob('job-3') as JobWithExtraction | undefined
    expect(updated?.extraction).toEqual(extraction)
  })

  it('does not match a demo-sourced job with the same URL — inserts a new record instead', () => {
    const repo = makeRepo()
    repo.prependJob({
      id: 'demo-1',
      title: 'Demo job',
      url: 'https://example.com/jobs/shared-url',
      rawText: 'デモ求人テキスト',
      collectedAt: '2026-06-28T00:00:00.000Z',
      source: 'demo',
    } as Job)

    collectUpsert(repo, {
      url: 'https://example.com/jobs/shared-url',
      title: 'Real collected job',
      rawText: '実際に収集した求人テキスト',
      collectedAt: '2026-07-14T00:00:00.000Z',
    })

    const jobs = repo.readJobs()
    expect(jobs).toHaveLength(2) // demo job untouched, new non-demo job added
    const demoJob = jobs.find((j) => j.id === 'demo-1')
    expect(demoJob?.title).toBe('Demo job') // untouched
  })

  it('matches an Indeed job re-collected with different per-visit tracking params (same jk)', () => {
    const repo = makeRepo()
    repo.prependJob({
      id: 'job-4',
      title: 'Old title',
      url: 'https://jp.indeed.com/viewjob?jk=abc123&tk=1h9q8&adid=99887766',
      rawText: '古い求人テキスト',
      collectedAt: '2026-07-01T00:00:00.000Z',
    })

    collectUpsert(repo, {
      url: 'https://jp.indeed.com/viewjob?jk=abc123&sjdu=xyz&acatk=foo&camk=bar',
      title: 'New title',
      rawText: '新しい求人テキスト',
      collectedAt: '2026-07-14T00:00:00.000Z',
    })

    const jobs = repo.readJobs()
    expect(jobs).toHaveLength(1) // no duplicate row inserted despite different tracking params
    expect(jobs[0].id).toBe('job-4')
    expect(jobs[0].title).toBe('New title')
  })
})
