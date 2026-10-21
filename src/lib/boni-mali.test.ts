import { describe, it, expect } from 'vitest'
import {
  computeDay,
  workedIntervals,
  splitBlocks,
  groupByBrusselsDay,
  fmtSignedMinutes,
  baseMinutesFromHours,
  arrivalRefusal,
  DEFAULT_WORK_MODES,
} from './boni-mali'

// Fixtures = real rows from the Interreg FWVL timesheet (September 2026, Brussels summer time = UTC+2).
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+02:00`)
const mode = (code: string) => DEFAULT_WORK_MODES.find(m => m.code === code)!
const BASE = baseMinutesFromHours(7.6)

// Two blocks with a lunch break, like the timesheet: in/out, in/out.
function day(date: string, in1: string, out1: string, in2: string, out2: string) {
  return [
    { start: at(date, in1), end: at(date, out1) },
    { start: at(date, in2), end: at(date, out2) },
  ]
}

function run(code: string, intervals: ReturnType<typeof day>) {
  const r = computeDay({ intervals, mode: mode(code), baseMinutes: BASE })
  return { ...r, boni: fmtSignedMinutes(r.boniMinutes), mali: fmtSignedMinutes(r.maliMinutes) }
}

describe('baseMinutesFromHours', () => {
  it('7.6 h is 7h36', () => expect(BASE).toBe(456))
})

describe('computeDay — Interreg timesheet rows', () => {
  it('TT 16/09 7h40 → surplus dropped, no boni, no mali', () => {
    const r = run('TT', day('2026-09-16', '08:30', '13:00', '13:30', '16:40'))
    expect(r.workedMinutes).toBe(460)
    expect(r.boniMinutes).toBe(0)
    expect(r.maliMinutes).toBe(0)
  })

  it('TT 04/09 7h30 → mali -0:06', () => {
    expect(run('TT', day('2026-09-04', '08:30', '13:00', '13:30', '16:30')).mali).toBe('-0:06')
  })

  it('TT 21/09 6h45 → mali -0:51', () => {
    expect(run('TT', day('2026-09-21', '09:30', '13:00', '13:30', '16:45')).mali).toBe('-0:51')
  })

  it('TT 23/09 6h55 → mali -0:41', () => {
    expect(run('TT', day('2026-09-23', '09:30', '13:00', '13:30', '16:55')).mali).toBe('-0:41')
  })

  it('PR 02/09 8h15 → boni 0:39', () => {
    expect(run('PR', day('2026-09-02', '09:00', '13:00', '13:30', '17:45')).boni).toBe('0:39')
  })

  it('PR 03/09 8h30 → boni 0:54', () => {
    expect(run('PR', day('2026-09-03', '09:00', '13:00', '13:30', '18:00')).boni).toBe('0:54')
  })

  it('PR 14/09 6h30 → mali -1:06', () => {
    expect(run('PR', day('2026-09-14', '09:00', '13:00', '13:30', '16:00')).mali).toBe('-1:06')
  })

  it('PR 15/09 8h00 → boni 0:24', () => {
    expect(run('PR', day('2026-09-15', '09:00', '13:00', '13:30', '17:30')).boni).toBe('0:24')
  })

  it('MIS 10/09 10h30 → boni 2:54', () => {
    expect(run('MIS', day('2026-09-10', '08:30', '13:00', '13:30', '19:30')).boni).toBe('2:54')
  })

  it('MIS 18/09 10h45 → boni 3:09, no flag', () => {
    const r = run('MIS', day('2026-09-18', '08:30', '13:00', '13:30', '19:45'))
    expect(r.boni).toBe('3:09')
    expect(r.flags).toEqual([])
  })

  it('MIS 22/09 11h00 → boni 3:24', () => {
    expect(run('MIS', day('2026-09-22', '08:30', '13:00', '13:30', '20:00')).boni).toBe('3:24')
  })
})

describe('computeDay — PR rules', () => {
  it('10 h worked before 18h30 → capped at 9 h → boni 1:24, flagged', () => {
    const r = run('PR', day('2026-09-16', '07:00', '12:00', '12:30', '17:30'))
    expect(r.workedMinutes).toBe(600)
    expect(r.countedMinutes).toBe(540)
    expect(r.boni).toBe('1:24')
    expect(r.flags).toEqual(['over_daily_max'])
  })

  it('departure at 19:00 → counted until 18:30, flagged', () => {
    const r = run('PR', day('2026-09-16', '10:00', '13:00', '13:30', '19:00'))
    expect(r.workedMinutes).toBe(510)
    expect(r.countedMinutes).toBe(480)
    expect(r.boni).toBe('0:24')
    expect(r.flags).toEqual(['after_latest'])
  })

  it('both rules: 08:00 → 20:00 → clipped to 18:30, then capped at 9 h', () => {
    const r = run('PR', day('2026-09-16', '08:00', '13:00', '13:30', '20:00'))
    expect(r.countedMinutes).toBe(540)
    expect(r.flags).toEqual(['after_latest', 'over_daily_max'])
  })

  it('latest clock time follows Brussels winter time', () => {
    const intervals = [{ start: new Date('2026-12-01T09:00:00+01:00'), end: new Date('2026-12-01T19:00:00+01:00') }]
    const r = computeDay({ intervals, mode: { ...mode('PR'), dailyMaxMinutes: null }, baseMinutes: BASE })
    expect(r.countedMinutes).toBe(570) // 09:00 → 18:30
  })
})

describe('computeDay — no mode', () => {
  it('no rules: plain delta against base', () => {
    const r = computeDay({ intervals: day('2026-09-16', '08:00', '12:00', '12:30', '18:30'), mode: null, baseMinutes: BASE })
    expect(r.boniMinutes).toBe(600 - 456)
    expect(r.flags).toEqual([])
  })
})

describe('workedIntervals', () => {
  it('cuts closed breaks out of a record', () => {
    const intervals = workedIntervals({
      arrivalTime: at('2026-09-03', '08:30'),
      departureTime: at('2026-09-03', '16:40'),
      breaks: [{ startedAt: at('2026-09-03', '13:00'), endedAt: at('2026-09-03', '13:30') }],
    })
    expect(intervals).toEqual(day('2026-09-03', '08:30', '13:00', '13:30', '16:40'))
  })

  it('ignores open breaks and open records', () => {
    expect(workedIntervals({ arrivalTime: at('2026-09-03', '08:30'), departureTime: null })).toEqual([])
    const intervals = workedIntervals({
      arrivalTime: at('2026-09-03', '08:30'),
      departureTime: at('2026-09-03', '12:00'),
      breaks: [{ startedAt: at('2026-09-03', '10:00'), endedAt: null }],
    })
    expect(intervals).toHaveLength(1)
  })
})

describe('splitBlocks', () => {
  it('two intervals → morning and afternoon blocks', () => {
    const { block1, block2 } = splitBlocks(day('2026-09-03', '08:30', '13:00', '13:30', '16:40'))
    expect(block1?.minutes).toBe(270)
    expect(block2?.minutes).toBe(190)
  })

  it('three intervals → block 2 merges the rest', () => {
    const intervals = [
      ...day('2026-09-03', '08:00', '12:00', '13:00', '15:00'),
      { start: at('2026-09-03', '15:30'), end: at('2026-09-03', '17:00') },
    ]
    const { block2 } = splitBlocks(intervals)
    expect(block2?.in).toEqual(at('2026-09-03', '13:00'))
    expect(block2?.out).toEqual(at('2026-09-03', '17:00'))
    expect(block2?.minutes).toBe(210)
  })
})

describe('groupByBrusselsDay', () => {
  it('groups by Brussels day, sorted by arrival', () => {
    const records = [
      { arrivalTime: at('2026-09-03', '13:30'), departureTime: at('2026-09-03', '16:40') },
      { arrivalTime: at('2026-09-03', '08:30'), departureTime: at('2026-09-03', '13:00') },
      { arrivalTime: new Date('2026-09-03T22:30:00Z'), departureTime: null }, // 00:30 on 04/09 in Brussels
    ]
    const days = groupByBrusselsDay(records)
    expect([...days.keys()]).toEqual(['2026-09-03', '2026-09-04'])
    expect(days.get('2026-09-03')![0].arrivalTime).toEqual(at('2026-09-03', '08:30'))
  })
})

describe('fmtSignedMinutes', () => {
  it('formats like the timesheet', () => {
    expect(fmtSignedMinutes(189)).toBe('3:09')
    expect(fmtSignedMinutes(-41)).toBe('-0:41')
    expect(fmtSignedMinutes(0)).toBe('0:00')
  })
})

describe('arrivalRefusal', () => {
  const PR = mode('PR')
  const MIS = mode('MIS')

  it('PR before 18:30 is accepted, from the app and on site', () => {
    expect(arrivalRefusal(PR, at('2026-10-21', '18:29'), false)).toBeNull()
    expect(arrivalRefusal(PR, at('2026-10-21', '18:29'), true)).toBeNull()
  })

  it('PR at or after 18:30 is refused, wherever it comes from', () => {
    expect(arrivalRefusal(PR, at('2026-10-21', '18:30'), false)).toBe('after_latest')
    expect(arrivalRefusal(PR, at('2026-10-21', '21:00'), true)).toBe('after_latest')
  })

  it('uses Brussels winter time after the DST change', () => {
    const winter = (hhmm: string) => new Date(`2026-11-04T${hhmm}:00+01:00`)
    expect(arrivalRefusal(PR, winter('18:29'), false)).toBeNull()
    expect(arrivalRefusal(PR, winter('18:30'), false)).toBe('after_latest')
  })

  it('MIS has no limit', () => {
    expect(arrivalRefusal(MIS, at('2026-10-21', '22:00'), false)).toBeNull()
  })

  it('a latest clock time alone never refuses (calculation rule only)', () => {
    expect(arrivalRefusal({ ...PR, blockArrivalAfterLatest: false }, at('2026-10-21', '20:00'), false)).toBeNull()
  })

  it('blocking without a latest clock time refuses nothing', () => {
    expect(arrivalRefusal({ ...PR, latestClockTime: null }, at('2026-10-21', '20:00'), false)).toBeNull()
  })

  it('on-site-only refuses the app button but accepts QR / kiosk', () => {
    const onSitePR = { ...PR, requireOnSiteArrival: true }
    expect(arrivalRefusal(onSitePR, at('2026-10-21', '09:00'), false)).toBe('on_site_only')
    expect(arrivalRefusal(onSitePR, at('2026-10-21', '09:00'), true)).toBeNull()
  })

  it('no mode (feature off) never refuses', () => {
    expect(arrivalRefusal(null, at('2026-10-21', '23:00'), false)).toBeNull()
  })
})
