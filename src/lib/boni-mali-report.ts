import {
  computeDay,
  groupByBrusselsDay,
  splitBlocks,
  workedIntervals,
  type Block,
  type DayFlag,
  type RecordLike,
  type WorkModeRules,
} from '@/lib/boni-mali'

// Day-by-day Boni/Mali timesheet of one employee — the data behind the Excel export.

export type ReportRecord = RecordLike & { workMode: WorkModeRules | null }

export type ReportDay = {
  dateKey: string          // "YYYY-MM-DD" (Brussels)
  weekday: number          // 1 = Monday … 7 = Sunday
  isWeekend: boolean
  block1: Block | null
  block2: Block | null
  workedMinutes: number
  baseMinutes: number      // 0 on weekends and leave days
  boniMinutes: number
  maliMinutes: number
  code: string             // work code, or '' on leave / empty days
  label: string            // work code label, leave label, or ''
  payrollFlag: string | null
  flags: DayFlag[]
  hasOpenRecord: boolean
  hasRecords: boolean
}

export type ReportTotals = {
  workedMinutes: number
  baseMinutes: number
  boniMinutes: number
  maliMinutes: number
  balanceMinutes: number
  daysByCode: Record<string, number>
  payrollFlagDays: Record<string, number>
}

/** Every Brussels calendar day key from `from` to `to` included ("YYYY-MM-DD"). */
export function dayKeysBetween(from: string, to: string): string[] {
  const keys: string[] = []
  const cur = new Date(`${from}T12:00:00Z`)
  const end = new Date(`${to}T12:00:00Z`)
  while (cur <= end) {
    keys.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return keys
}

const isoWeekday = (dateKey: string) => {
  const d = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

export function buildEmployeeReport({
  from,
  to,
  records,
  baseMinutes,
  leaves,
  defaultMode,
}: {
  from: string
  to: string
  records: ReportRecord[]
  baseMinutes: number
  leaves: Map<string, string> // dateKey → leave label
  defaultMode: WorkModeRules | null // applied to records clocked without a code (kiosk, QR…)
}): { days: ReportDay[]; totals: ReportTotals } {
  const byDay = groupByBrusselsDay(records)
  const days: ReportDay[] = []
  const totals: ReportTotals = {
    workedMinutes: 0, baseMinutes: 0, boniMinutes: 0, maliMinutes: 0, balanceMinutes: 0, daysByCode: {}, payrollFlagDays: {},
  }

  for (const dateKey of dayKeysBetween(from, to)) {
    const weekday = isoWeekday(dateKey)
    const isWeekend = weekday >= 6
    const dayRecords = byDay.get(dateKey) ?? []
    const leave = leaves.get(dateKey)
    const intervals = dayRecords.flatMap(workedIntervals)
    const { block1, block2 } = splitBlocks(intervals)
    const hasRecords = dayRecords.length > 0
    const mode = hasRecords ? (dayRecords[0].workMode ?? defaultMode) : null

    // Base is due on working days only; leave days and weekends owe nothing.
    const dayBase = isWeekend || leave ? 0 : baseMinutes
    // A working day without any clocking is left empty (not counted as mali): it is
    // usually a missing leave request or a holiday the admin has to regularise.
    const result = hasRecords
      ? computeDay({ intervals, mode, baseMinutes: dayBase })
      : { workedMinutes: 0, countedMinutes: 0, baseMinutes: dayBase, boniMinutes: 0, maliMinutes: 0, flags: [] as DayFlag[] }

    const day: ReportDay = {
      dateKey,
      weekday,
      isWeekend,
      block1,
      block2,
      workedMinutes: result.workedMinutes,
      baseMinutes: dayBase,
      boniMinutes: result.boniMinutes,
      maliMinutes: result.maliMinutes,
      code: mode?.code ?? '',
      label: leave ?? mode?.label ?? '',
      payrollFlag: mode?.payrollFlag ?? null,
      flags: result.flags,
      hasOpenRecord: dayRecords.some(r => !r.departureTime),
      hasRecords,
    }
    days.push(day)

    totals.workedMinutes += day.workedMinutes
    if (hasRecords) totals.baseMinutes += day.baseMinutes
    totals.boniMinutes += day.boniMinutes
    totals.maliMinutes += day.maliMinutes
    if (day.code) totals.daysByCode[day.code] = (totals.daysByCode[day.code] ?? 0) + 1
    if (day.payrollFlag) totals.payrollFlagDays[day.payrollFlag] = (totals.payrollFlagDays[day.payrollFlag] ?? 0) + 1
  }
  totals.balanceMinutes = totals.boniMinutes + totals.maliMinutes
  return { days, totals }
}
