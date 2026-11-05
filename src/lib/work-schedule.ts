// Contractual hours of a work schedule template, to the minute.
// Shared by the schedules screen (live preview) and the API (stored hoursPerDay / weeklyHours).

export type ScheduleDayType = 'office' | 'remote' | 'half'
export type ScheduleDayEntry = { type: ScheduleDayType; startTime?: string; endTime?: string }

export const MAX_UNPAID_BREAK_MINUTES = 240

/** "HH:MM" between 00:00 and 23:59. */
export const isValidTime = (v: unknown): v is string =>
  typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Worked minutes of one day: end − start (+24 h for a night shift) minus the unpaid break, never below 0. */
export function dayMinutes(startTime: string, endTime: string, unpaidBreakMinutes = 0): number {
  let span = toMinutes(endTime) - toMinutes(startTime)
  if (span <= 0) span += 24 * 60
  return Math.max(0, span - unpaidBreakMinutes)
}

/**
 * Weekly and average daily minutes of a template. The unpaid break is taken from full days
 * (office / remote) only, never from half days.
 */
export function scheduleTotals({
  startTime,
  endTime,
  daysOfWeek,
  dayConfig,
  unpaidBreakMinutes = 0,
}: {
  startTime: string
  endTime: string
  daysOfWeek: number[]
  dayConfig?: Record<string, ScheduleDayEntry> | null
  unpaidBreakMinutes?: number
}): { weeklyMinutes: number; perDayMinutes: number } {
  let weeklyMinutes = 0
  for (const d of daysOfWeek) {
    const entry = dayConfig?.[d]
    const breakMin = entry?.type === 'half' ? 0 : unpaidBreakMinutes
    weeklyMinutes += dayMinutes(entry?.startTime || startTime, entry?.endTime || endTime, breakMin)
  }
  const perDayMinutes = daysOfWeek.length ? Math.round(weeklyMinutes / daysOfWeek.length) : 0
  return { weeklyMinutes, perDayMinutes }
}

/**
 * Parses the dayConfig JSON stored on WorkSchedule; invalid or empty → null.
 * Older templates store a bare type per day ({"3":"half"}), newer ones an object with times.
 */
export function parseDayConfig(raw: string | null | undefined): Record<string, ScheduleDayEntry> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return Object.fromEntries(Object.entries(parsed).map(([d, v]) =>
      [d, typeof v === 'string' ? { type: v as ScheduleDayType } : v as ScheduleDayEntry]))
  } catch {
    return null
  }
}

/** Accepts an integer number of minutes between 0 and MAX_UNPAID_BREAK_MINUTES. */
export function isValidUnpaidBreak(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_UNPAID_BREAK_MINUTES
}
