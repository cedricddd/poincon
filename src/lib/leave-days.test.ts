import { describe, it, expect } from 'vitest'
import {
  belgianPublicHolidays,
  countLeaveDays,
  workDaysFromSchedule,
  requestLeaveDays,
  DEFAULT_WORK_DAYS,
} from './leave-days'

const MON_THU = { 1: 1, 2: 1, 3: 1, 4: 1 }

describe('belgianPublicHolidays', () => {
  it('2027: Easter Monday 29/3, Ascension 6/5, Whit Monday 17/5', () => {
    const h = belgianPublicHolidays(2027)
    expect(h.has('2027-03-29')).toBe(true)
    expect(h.has('2027-05-06')).toBe(true)
    expect(h.has('2027-05-17')).toBe(true)
    expect(h.size).toBe(10)
  })
  it('2026: Easter Monday 6/4 and the fixed days', () => {
    const h = belgianPublicHolidays(2026)
    for (const d of ['2026-01-01', '2026-04-06', '2026-05-01', '2026-05-14', '2026-05-25', '2026-07-21', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25']) {
      expect(h.has(d)).toBe(true)
    }
  })
})

describe('countLeaveDays', () => {
  it('Danielle, 4/5 Monday–Thursday, 9 → 19/11/2026 → 7 (weekend, Friday 13 and 11/11 excluded)', () => {
    expect(countLeaveDays('2026-11-09', '2026-11-19', MON_THU)).toBe(7)
  })
  it('same leave, full-time Monday–Friday → 8', () => {
    expect(countLeaveDays('2026-11-09', '2026-11-19', DEFAULT_WORK_DAYS)).toBe(8)
  })
  it('leave on a weekend only → 0', () => {
    expect(countLeaveDays('2026-11-14', '2026-11-15', DEFAULT_WORK_DAYS)).toBe(0)
  })
  it('half day in the schedule counts 0.5', () => {
    expect(countLeaveDays('2026-11-16', '2026-11-18', { 1: 1, 2: 1, 3: 0.5 })).toBe(2.5)
  })
  it('crosses the new year: 31/12 → 4/1 full-time → 2 (Thu 31/12 + Mon 4/1; Fri 1/1 holiday, then the weekend)', () => {
    expect(countLeaveDays('2026-12-31', '2027-01-04', DEFAULT_WORK_DAYS)).toBe(2)
  })
})

describe('workDaysFromSchedule', () => {
  it('no schedule → Monday to Friday', () => {
    expect(workDaysFromSchedule(null)).toEqual(DEFAULT_WORK_DAYS)
  })
  it('reads the days and the half days (legacy and current dayConfig)', () => {
    expect(workDaysFromSchedule({ daysOfWeek: '[1,2,3,4]', dayConfig: '{"3":"half"}' })).toEqual({ 1: 1, 2: 1, 3: 0.5, 4: 1 })
    expect(workDaysFromSchedule({ daysOfWeek: '[1,2]', dayConfig: '{"2":{"type":"remote"}}' })).toEqual({ 1: 1, 2: 1 })
  })
  it('broken JSON → Monday to Friday', () => {
    expect(workDaysFromSchedule({ daysOfWeek: 'oops', dayConfig: null })).toEqual(DEFAULT_WORK_DAYS)
  })
})

describe('requestLeaveDays', () => {
  it('dates stored as UTC midnight or Brussels midnight give the same count', () => {
    const utc = { startDate: new Date('2026-11-09T00:00:00Z'), endDate: new Date('2026-11-19T00:00:00Z') }
    const brussels = { startDate: '2026-11-08T23:00:00.000Z', endDate: '2026-11-18T23:00:00.000Z' }
    expect(requestLeaveDays(utc, MON_THU)).toBe(7)
    expect(requestLeaveDays(brussels, MON_THU)).toBe(7)
  })
})
