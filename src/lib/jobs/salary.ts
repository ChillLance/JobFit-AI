// Salary parsing for sorting (Phase 2 follow-up).
//
// Japanese postings express pay as 時給 (hourly), 日給 (daily), 月給/月収
// (monthly), or 年収/年俸 (annual), usually as free text — often with the 万
// (×10,000) shorthand and often as a range. To make jobs comparable, every
// form is normalized to an **estimated monthly JPY** figure:
//
//   hourly × 160h · daily × 22 days · annual ÷ 12 · ranges take the LOWER
//   bound (conservative, and ranges sort sensibly against fixed amounts).
//
// Pure module: no fs, no network. Estimates are for sorting/comparison only
// and are never persisted.

export type SalaryPeriod = 'hourly' | 'daily' | 'monthly' | 'annual'

export type SalaryEstimate = {
  /** Normalized, estimated monthly JPY (lower bound for ranges). */
  monthlyJpy: number
  /** Which pay period the source text used. */
  period: SalaryPeriod
}

const HOURS_PER_MONTH = 160
const DAYS_PER_MONTH = 22

// Keyword → period, checked in order. 月収/月給/月額 before 給与-generic terms.
const PERIOD_PATTERNS: { period: SalaryPeriod; regex: RegExp }[] = [
  { period: 'hourly', regex: /時給/ },
  { period: 'daily', regex: /日給/ },
  { period: 'monthly', regex: /月給|月収|月額/ },
  { period: 'annual', regex: /年収|年俸/ },
]

// First money amount after a period keyword: optional spaces/symbols, digits
// with optional commas, optional 万 multiplier. `[^0-9]{0,8}` tolerates "：",
// "約", full-width spaces, etc. between the keyword and the number. The
// number MUST be followed by a currency marker (万 / 円 / ¥ / ￥) so that
// "時給は2026年に改定" doesn't read the year 2026 as pay.
function amountAfter(text: string, keyword: RegExp): number | null {
  const pattern = new RegExp(
    `(?:${keyword.source})[^0-9]{0,8}([0-9][0-9,.]*)\\s*(?:(万)\\s*円?|円|¥|￥)`
  )
  const match = text.match(pattern)
  if (!match) return null

  const raw = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(raw) || raw <= 0) return null

  return match[2] ? raw * 10000 : raw
}

function toMonthly(amount: number, period: SalaryPeriod): number {
  switch (period) {
    case 'hourly':
      return amount * HOURS_PER_MONTH
    case 'daily':
      return amount * DAYS_PER_MONTH
    case 'annual':
      return amount / 12
    default:
      return amount
  }
}

// Sanity bounds: a "monthly" estimate outside 30,000–10,000,000 JPY is almost
// certainly a mis-parse (e.g. a phone number or a year) — reject it.
function isPlausibleMonthly(monthly: number): boolean {
  return monthly >= 30_000 && monthly <= 10_000_000
}

/**
 * Parse one free-text salary string into an estimated monthly JPY figure.
 * Returns `null` when no period keyword + plausible amount is found.
 */
export function parseSalaryText(text: string): SalaryEstimate | null {
  if (!text || typeof text !== 'string') return null

  for (const { period, regex } of PERIOD_PATTERNS) {
    if (!regex.test(text)) continue
    const amount = amountAfter(text, regex)
    if (amount === null) continue
    const monthlyJpy = Math.round(toMonthly(amount, period))
    if (!isPlausibleMonthly(monthlyJpy)) continue
    return { monthlyJpy, period }
  }

  return null
}

/**
 * Estimate a job's monthly salary for sorting. Prefers the structured
 * `salary` field; falls back to scanning `rawText` (extension-collected jobs
 * usually only have raw text). Returns `null` when nothing parseable exists —
 * such jobs sort last.
 */
export function getJobSalaryEstimate(job: {
  salary?: string
  rawText?: string
}): SalaryEstimate | null {
  return (
    parseSalaryText(job.salary ?? '') ?? parseSalaryText(job.rawText ?? '')
  )
}
