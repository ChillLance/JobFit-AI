import { describe, expect, it } from 'vitest'
import { normalizeJobUrl } from './normalizeJobUrl'

describe('normalizeJobUrl', () => {
  it('treats two Indeed viewjob URLs with the same jk but different tracking params as equal', () => {
    const a =
      'https://jp.indeed.com/viewjob?jk=abc123&tk=1h9q8&adid=99887766&xkcb=SoAl'
    const b =
      'https://jp.indeed.com/viewjob?jk=abc123&sjdu=xyz&acatk=foo&camk=bar&jrtk=baz'

    expect(normalizeJobUrl(a)).toBe(normalizeJobUrl(b))
  })

  it('treats two Indeed viewjob URLs with different jk as not equal', () => {
    const a = 'https://jp.indeed.com/viewjob?jk=abc123&tk=1h9q8'
    const b = 'https://jp.indeed.com/viewjob?jk=def456&tk=1h9q8'

    expect(normalizeJobUrl(a)).not.toBe(normalizeJobUrl(b))
  })

  it('treats resortbaito URLs with and without a trailing slash as equal', () => {
    const a = 'https://www.resortbaito.com/job/12345/'
    const b = 'https://www.resortbaito.com/job/12345'

    expect(normalizeJobUrl(a)).toBe(normalizeJobUrl(b))
  })

  it('strips utm_* tracking params so otherwise-identical URLs compare equal', () => {
    const a = 'https://example.com/jobs/1?utm_source=newsletter&utm_medium=email'
    const b = 'https://example.com/jobs/1'

    expect(normalizeJobUrl(a)).toBe(normalizeJobUrl(b))
  })

  it('returns an unparseable string trimmed but otherwise unchanged', () => {
    expect(normalizeJobUrl('  not a url at all  ')).toBe('not a url at all')
  })

  it('sorts remaining query params by key for non-Indeed URLs', () => {
    const a = 'https://example.com/jobs/2?b=2&a=1'
    const b = 'https://example.com/jobs/2?a=1&b=2'

    expect(normalizeJobUrl(a)).toBe(normalizeJobUrl(b))
    expect(normalizeJobUrl(a)).toBe('https://example.com/jobs/2?a=1&b=2')
  })

  it('lowercases the host', () => {
    expect(normalizeJobUrl('https://Example.COM/jobs/3')).toBe(
      'https://example.com/jobs/3'
    )
  })

  it('does not keep an Indeed viewjob URL special-cased when jk is missing', () => {
    const url = 'https://jp.indeed.com/viewjob?tk=1h9q8&adid=99887766'
    expect(normalizeJobUrl(url)).toBe('https://jp.indeed.com/viewjob?adid=99887766&tk=1h9q8')
  })
})
