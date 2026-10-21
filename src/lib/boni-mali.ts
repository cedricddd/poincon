import { brusselsDateKey, parseShiftTime } from '@/lib/clock'

// Boni/Mali engine — pure functions, no DB access.
// A day's worked time is compared to the employee's contractual base (UserSchedule.hoursPerDay):
//   delta = counted − base ; boni = clamp(delta, 0, boniCap) ; mali = min(delta, 0)
// "counted" applies the work mode's rules (latest clock time, daily max) to the raw worked time.
// Time beyond a rule is ignored in the calculation and flagged. A mode may additionally refuse
// the clock-in itself (see ArrivalRules) — departures are never refused.

export type WorkModeRules = {
  code: string
  label: string
  boniCapMinutes: number | null   // null = unlimited, 0 = never any boni
  dailyMaxMinutes: number | null  // null = no daily cap
  latestClockTime: string | null  // "HH:MM" Brussels — time worked after it is not counted
  payrollFlag: string | null
}

/** Clock-in restrictions of a work mode, checked when an arrival is recorded. */
export type ArrivalRules = {
  latestClockTime: string | null
  blockArrivalAfterLatest: boolean // refuse an arrival at or after latestClockTime
  requireOnSiteArrival: boolean    // arrival only through a site QR code or a kiosk
}

export type Interval = { start: Date; end: Date }

export type DayFlag = 'after_latest' | 'over_daily_max'

export type Block = { in: Date; out: Date; minutes: number }

export type DayResult = {
  workedMinutes: number
  countedMinutes: number
  baseMinutes: number
  boniMinutes: number
  maliMinutes: number // <= 0
  flags: DayFlag[]
}

type BreakLike = { startedAt: Date; endedAt: Date | null }

export type RecordLike = {
  arrivalTime: Date
  departureTime: Date | null
  breaks?: BreakLike[]
}

const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000)

/**
 * Worked intervals of a closed clock record, with closed breaks cut out.
 * An open record (no departure) yields nothing.
 */
export function workedIntervals(record: RecordLike): Interval[] {
  if (!record.departureTime) return []
  const breaks = (record.breaks ?? [])
    .filter((b): b is { startedAt: Date; endedAt: Date } => b.endedAt != null)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())

  const intervals: Interval[] = []
  let cursor = record.arrivalTime
  for (const b of breaks) {
    if (b.startedAt > cursor) intervals.push({ start: cursor, end: b.startedAt < record.departureTime ? b.startedAt : record.departureTime })
    if (b.endedAt > cursor) cursor = b.endedAt
    if (cursor >= record.departureTime) break
  }
  if (record.departureTime > cursor) intervals.push({ start: cursor, end: record.departureTime })
  return intervals.filter(i => i.end > i.start)
}

/**
 * Morning / afternoon blocks as in a classic timesheet:
 * block 1 = first interval, block 2 = everything after it merged (in = 2nd start, out = last end).
 */
export function splitBlocks(intervals: Interval[]): { block1: Block | null; block2: Block | null } {
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime())
  if (sorted.length === 0) return { block1: null, block2: null }
  const [first, ...rest] = sorted
  const block1 = { in: first.start, out: first.end, minutes: minutesBetween(first.start, first.end) }
  if (rest.length === 0) return { block1, block2: null }
  const block2 = {
    in: rest[0].start,
    out: rest[rest.length - 1].end,
    minutes: rest.reduce((sum, i) => sum + minutesBetween(i.start, i.end), 0),
  }
  return { block1, block2 }
}

export function computeDay({
  intervals,
  mode,
  baseMinutes,
}: {
  intervals: Interval[]
  mode: WorkModeRules | null
  baseMinutes: number
}): DayResult {
  const flags: DayFlag[] = []
  const workedMinutes = intervals.reduce((sum, i) => sum + minutesBetween(i.start, i.end), 0)

  let counted = workedMinutes
  if (mode?.latestClockTime) {
    let clipped = 0
    for (const i of intervals) {
      const cutoff = parseShiftTime(mode.latestClockTime, i.start)
      const end = i.end > cutoff ? cutoff : i.end
      if (end > i.start) clipped += minutesBetween(i.start, end)
    }
    if (clipped < counted) flags.push('after_latest')
    counted = clipped
  }

  if (mode?.dailyMaxMinutes != null && counted > mode.dailyMaxMinutes) {
    counted = mode.dailyMaxMinutes
    flags.push('over_daily_max')
  }

  const delta = counted - baseMinutes
  const cap = mode?.boniCapMinutes ?? Infinity
  return {
    workedMinutes,
    countedMinutes: counted,
    baseMinutes,
    boniMinutes: Math.max(0, Math.min(delta, cap)),
    maliMinutes: Math.min(delta, 0),
    flags,
  }
}

/** Contractual base in minutes from UserSchedule.hoursPerDay (7.6 h → 456 min = 7h36). */
export function baseMinutesFromHours(hoursPerDay: number): number {
  return Math.round(hoursPerDay * 60)
}

/**
 * Groups records by Brussels calendar day (key "YYYY-MM-DD", based on arrival).
 * Within a day records are sorted by arrival; the day's mode is the first record's.
 */
export function groupByBrusselsDay<T extends RecordLike>(records: T[]): Map<string, T[]> {
  const days = new Map<string, T[]>()
  for (const r of [...records].sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime())) {
    const key = brusselsDateKey(r.arrivalTime)
    if (!days.has(key)) days.set(key, [])
    days.get(key)!.push(r)
  }
  return days
}

/** Signed minutes → "H:MM" / "-H:MM" (timesheet notation). */
export function fmtSignedMinutes(minutes: number): string {
  const sign = minutes < 0 ? '-' : ''
  const abs = Math.abs(minutes)
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
}

/**
 * Arrival check: which restriction (if any) refuses a clock-in at `at` under `mode`.
 * `onSite` is true for site QR codes and kiosks, false for the app button.
 */
export function arrivalRefusal(
  mode: ArrivalRules | null,
  at: Date,
  onSite: boolean,
): 'after_latest' | 'on_site_only' | null {
  if (!mode) return null
  if (mode.requireOnSiteArrival && !onSite) return 'on_site_only'
  if (mode.blockArrivalAfterLatest && mode.latestClockTime && at >= parseShiftTime(mode.latestClockTime, at)) {
    return 'after_latest'
  }
  return null
}

/** Default codes offered by the "prefill" button — matches the Interreg FWVL rules. */
export const DEFAULT_WORK_MODES: (WorkModeRules & Omit<ArrivalRules, 'latestClockTime'> & { isDefault: boolean; sortOrder: number })[] = [
  { code: 'PR', label: 'Bureau', boniCapMinutes: null, dailyMaxMinutes: 540, latestClockTime: '18:30', payrollFlag: null, blockArrivalAfterLatest: true, requireOnSiteArrival: false, isDefault: true, sortOrder: 0 },
  { code: 'TT', label: 'Télétravail', boniCapMinutes: 0, dailyMaxMinutes: null, latestClockTime: null, payrollFlag: null, blockArrivalAfterLatest: false, requireOnSiteArrival: false, isDefault: false, sortOrder: 1 },
  { code: 'MIS', label: 'Missions externes', boniCapMinutes: null, dailyMaxMinutes: null, latestClockTime: null, payrollFlag: 'no_social_transport', blockArrivalAfterLatest: false, requireOnSiteArrival: false, isDefault: false, sortOrder: 2 },
]
