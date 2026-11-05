import { describe, it, expect } from 'vitest'
import { dayMinutes, scheduleTotals, parseDayConfig, isValidUnpaidBreak, isValidTime } from './work-schedule'

describe('dayMinutes', () => {
  it('08:30–16:36 with 30 min break → 7h36', () => {
    expect(dayMinutes('08:30', '16:36', 30)).toBe(456)
  })
  it('keeps minutes instead of rounding to the half hour', () => {
    expect(dayMinutes('08:30', '16:36')).toBe(486)
  })
  it('night shift 22:00–06:00 → 8 h', () => {
    expect(dayMinutes('22:00', '06:00')).toBe(480)
  })
  it('break longer than the span → 0', () => {
    expect(dayMinutes('09:00', '09:20', 30)).toBe(0)
  })
})

describe('scheduleTotals', () => {
  it('Interreg STC: 5 × 08:30–16:36 with 30 min → 38 h/week, 7h36/day', () => {
    const r = scheduleTotals({ startTime: '08:30', endTime: '16:36', daysOfWeek: [1, 2, 3, 4, 5], unpaidBreakMinutes: 30 })
    expect(r).toEqual({ weeklyMinutes: 2280, perDayMinutes: 456 })
  })
  it('no break taken from a half day', () => {
    const r = scheduleTotals({
      startTime: '08:30', endTime: '16:36', daysOfWeek: [1, 3], unpaidBreakMinutes: 30,
      dayConfig: { 3: { type: 'half', startTime: '08:30', endTime: '12:18' } },
    })
    expect(r.weeklyMinutes).toBe(456 + 228)
  })
  it('per-day times override the default ones, telework days keep the break', () => {
    const r = scheduleTotals({
      startTime: '08:00', endTime: '16:00', daysOfWeek: [1, 2], unpaidBreakMinutes: 30,
      dayConfig: { 2: { type: 'remote', startTime: '09:00', endTime: '17:00' } },
    })
    expect(r.weeklyMinutes).toBe(450 + 450)
  })
  it('no working day → 0', () => {
    expect(scheduleTotals({ startTime: '08:00', endTime: '16:00', daysOfWeek: [] })).toEqual({ weeklyMinutes: 0, perDayMinutes: 0 })
  })
})

describe('parseDayConfig / isValidUnpaidBreak', () => {
  it('parses stored JSON and ignores garbage', () => {
    expect(parseDayConfig('{"1":{"type":"remote"}}')).toEqual({ 1: { type: 'remote' } })
    expect(parseDayConfig('{"3":"half"}')).toEqual({ 3: { type: 'half' } })
    expect(parseDayConfig('not json')).toBeNull()
    expect(parseDayConfig(null)).toBeNull()
  })
  it('accepts whole minutes from 0 to 240 only', () => {
    expect(isValidUnpaidBreak(30)).toBe(true)
    expect(isValidUnpaidBreak(0)).toBe(true)
    expect(isValidUnpaidBreak(241)).toBe(false)
    expect(isValidUnpaidBreak(-5)).toBe(false)
    expect(isValidUnpaidBreak(12.5)).toBe(false)
    expect(isValidUnpaidBreak('30')).toBe(false)
  })
})

describe('isValidTime', () => {
  it('accepts HH:MM only', () => {
    expect(isValidTime('08:30')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('8:30')).toBe(false)
    expect(isValidTime('nope')).toBe(false)
  })
})
