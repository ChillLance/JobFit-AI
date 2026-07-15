import { describe, expect, it } from 'vitest'
import {
  DIRECTION_DISCOVERY_PROMPTS,
  PROFILE_BUILDER_PROMPTS,
} from './profilePrompt'

describe('profile prompts', () => {
  it('offers a direction-discovery prompt for every supported language', () => {
    for (const prompt of Object.values(DIRECTION_DISCOVERY_PROMPTS)) {
      expect(prompt.length).toBeGreaterThan(500)
      expect(prompt).toMatch(/Base|Bridge|Target/)
    }
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
