import { parseDayConfig } from '@/lib/work-schedule'

// Leave days counted in working days: only the days the person works according to their
// schedule, public holidays excluded. Pure functions, shared by the API and the screens.

/** Weight of each ISO weekday (1 = Monday … 7 = Sunday): 1 full day, 0.5 half day; absent = not worked. */
export type WorkDays = Partial<Record<number, number>>

export const DEFAULT_WORK_DAYS: WorkDays = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)

/** Easter Sunday (Gregorian calendar, anonymous algorithm), as a UTC date. */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

const holidayCache = new Map<number, Set<string>>()

/** The 10 Belgian legal public holidays of a year, as "YYYY-MM-DD" keys. */
export function belgianPublicHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year)
  if (cached) return cached
  const easter = easterSunday(year)
  const set = new Set([
    `${year}-01-01`,
    keyOf(addDays(easter, 1)),  // Easter Monday
    `${year}-05-01`,
    keyOf(addDays(easter, 39)), // Ascension
    keyOf(addDays(easter, 50)), // Whit Monday
    `${year}-07-21`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-11-11`,
    `${year}-12-25`,
  ])
  holidayCache.set(year, set)
  return set
}

/** Working days of a schedule template (daysOfWeek JSON + per-day half days); none → Monday to Friday. */
export function workDaysFromSchedule(
  schedule: { daysOfWeek: string; dayConfig: string | null } | null | undefined,
): WorkDays {
  if (!schedule) return DEFAULT_WORK_DAYS
  let days: unknown
  try { days = JSON.parse(schedule.daysOfWeek) } catch { return DEFAULT_WORK_DAYS }
  if (!Array.isArray(days)) return DEFAULT_WORK_DAYS
  const config = parseDayConfig(schedule.dayConfig)
  const result: WorkDays = {}
  for (const d of days) {
    if (Number.isInteger(d) && d >= 1 && d <= 7) result[d] = config?.[d]?.type === 'half' ? 0.5 : 1
  }
  return result
}

/** "YYYY-MM-DD" of a stored leave date in Brussels time (dates are saved as midnight UTC or Brussels). */
export function leaveDateKey(date: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(date))
}

/** Working days between two "YYYY-MM-DD" keys included, public holidays excluded. */
export function countLeaveDays(startKey: string, endKey: string, workDays: WorkDays): number {
  let total = 0
  const end = new Date(`${endKey}T00:00:00Z`)
  for (let d = new Date(`${startKey}T00:00:00Z`); d <= end; d = addDays(d, 1)) {
    const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
    const weight = workDays[weekday] ?? 0
    if (weight > 0 && !belgianPublicHolidays(d.getUTCFullYear()).has(keyOf(d))) total += weight
  }
  return total
}

/** Leave days of a stored request (Date or ISO string bounds). */
export function requestLeaveDays(r: { startDate: Date | string; endDate: Date | string }, workDays: WorkDays): number {
  return countLeaveDays(leaveDateKey(r.startDate), leaveDateKey(r.endDate), workDays)
}
