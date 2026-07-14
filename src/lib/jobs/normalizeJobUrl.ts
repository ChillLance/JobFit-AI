// URL normalization for collect-time upsert-by-URL matching (task follow-up
// to design doc §9). Indeed appends large, per-visit session tracking
// params (tk/adid/xkcb/ad/sjdu/acatk/camk/jrtk/xpse/xfps/…) to
// `/viewjob` links — comparing raw URL strings means the same job re-collects
// as a "new" duplicate every time. The only stable identifier on an Indeed
// job-view URL is the `jk` param, so that case is special-cased; everything
// else gets a lighter generic cleanup (drop known tracking params, sort the
// rest, trim a trailing slash).
//
// Pure module: no fs, no network.

const TRACKING_PARAM_PREFIXES = ['utm_']
const TRACKING_PARAM_NAMES = new Set(['fbclid', 'gclid'])

function isTrackingParam(key: string): boolean {
  return (
    TRACKING_PARAM_NAMES.has(key) ||
    TRACKING_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix))
  )
}

/**
 * Normalize a job URL for equality comparison. Never throws — an
 * unparseable string is returned trimmed but otherwise unchanged, so callers
 * can always compare `normalizeJobUrl(a) === normalizeJobUrl(b)` safely.
 */
export function normalizeJobUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url.trim()
  }

  const host = parsed.hostname.toLowerCase()

  if (host.endsWith('indeed.com') && parsed.pathname === '/viewjob') {
    const jk = parsed.searchParams.get('jk')
    if (jk) {
      return `https://${host}/viewjob?jk=${jk}`
    }
  }

  let pathname = parsed.pathname
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '')
  }

  const keptParams = [...parsed.searchParams.entries()]
    .filter(([key]) => !isTrackingParam(key))
    .sort(([a], [b]) => a.localeCompare(b))

  const sortedSearch = new URLSearchParams()
  for (const [key, value] of keptParams) sortedSearch.append(key, value)
  const search = sortedSearch.toString()

  return `${parsed.protocol}//${host}${pathname}${search ? `?${search}` : ''}`
}
