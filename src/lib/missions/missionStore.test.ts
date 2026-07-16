import { describe, expect, it } from 'vitest'
import { createSearchMissionFromJson } from './missionStore'

describe('createSearchMissionFromJson', () => {
  it('keeps only supported Mission fields and creates local identity', () => {
    const mission = createSearchMissionFromJson({
      name: 'Winter ski season',
      targetRegions: ['Hokkaido', 42],
      goalPriorities: ['experience', 'growth', 'unknown'],
      constraints: { privateRoomRequired: true, maximumDormFeeJpy: 15000 },
      tradeoffs: [{ condition: 'remote', acceptableWhen: 'ski access is good' }, { condition: 3 }],
      id: 'untrusted-id',
    }, 'profile_1')

    expect(mission).not.toBeNull()
    expect(mission?.id).not.toBe('untrusted-id')
    expect(mission?.linkedProfileId).toBe('profile_1')
    expect(mission?.targetRegions).toEqual(['Hokkaido'])
    expect(mission?.goalPriorities.slice(0, 2)).toEqual(['experience', 'growth'])
    expect(mission?.constraints.privateRoomRequired).toBe(true)
    expect(mission?.tradeoffs).toEqual([{ condition: 'remote', acceptableWhen: 'ski access is good' }])
  })

  it('rejects a JSON object without a mission name', () => {
    expect(createSearchMissionFromJson({ targetRegions: ['Hokkaido'] })).toBeNull()
  })
})
