import { describe, expect, it } from 'vitest'
import {
  PROFILE_BUILDER_PROMPTS,
  SEARCH_MISSION_DISCOVERY_PROMPTS,
} from './profilePrompt'

describe('profile prompts', () => {
  it('starts a time-bound search from purpose instead of a fixed career direction', () => {
    for (const prompt of Object.values(SEARCH_MISSION_DISCOVERY_PROMPTS)) {
      expect(prompt.length).toBeGreaterThan(500)
      expect(prompt).toContain('Search Mission')
      expect(prompt).not.toContain('Base / Bridge / Target')
    }
    expect(SEARCH_MISSION_DISCOVERY_PROMPTS.en).toContain('no more than three')
    expect(SEARCH_MISSION_DISCOVERY_PROMPTS.en).toContain('Confirm Mission')
  })

  it('makes quick-profile prompts wait for a confirmed direction', () => {
    expect(PROFILE_BUILDER_PROMPTS['zh-TW']).toContain('確認輸出 Profile')
    expect(PROFILE_BUILDER_PROMPTS.en).toContain('explicit confirmation')
    expect(PROFILE_BUILDER_PROMPTS.ja).toContain('明示的な確認')
  })

  it('does not retain the old conservative-inference instruction', () => {
    expect(PROFILE_BUILDER_PROMPTS.en).not.toContain('infer conservatively')
    expect(PROFILE_BUILDER_PROMPTS.ja).not.toContain('保守的に推測')
  })
})
