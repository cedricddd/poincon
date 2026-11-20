import { describe, it, expect } from 'vitest'
import { computeShiftDuration, shouldSnapToSchedule } from './clock'

// Brussels is UTC+1 in November: 07:56 local = 06:56Z.
const at = (iso: string) => new Date(iso)

describe('shouldSnapToSchedule', () => {
  it('keeps snapping records without a work code, whatever the schedule', () => {
    expect(shouldSnapToSchedule(null)).toBe(true)
    expect(shouldSnapToSchedule(undefined)).toBe(true)
  })

  it('never snaps a record carrying a work code (Boni/Mali)', () => {
    expect(shouldSnapToSchedule('wm_pr')).toBe(false)
  })
})

describe('computeShiftDuration', () => {
  // Real case: 08:30–16:36 schedule, arrival 07:56:50, departure 16:33:47 → 517 min actual.
  const arrival = at('2026-11-09T06:56:50Z')
  const departure = at('2026-11-09T15:33:47Z')

  it('without code: an early arrival counts from the shift start', () => {
    const { duration } = computeShiftDuration(arrival, departure, '08:30', '16:36', 7.6, 0, true)
    expect(duration).toBe(484) // 08:30 → 16:33:47
  })

  it('with a work code: keeps the actual arrival time', () => {
    const { duration } = computeShiftDuration(arrival, departure, '08:30', '16:36', 7.6, 0, false)
    expect(duration).toBe(517)
  })

  it('without code: a departure within grace is snapped back to the shift end', () => {
    const { duration } = computeShiftDuration(
      at('2026-11-13T07:39:17Z'), at('2026-11-13T15:47:35Z'), '08:30', '16:36', 7.6, 0, true
    )
    expect(duration).toBe(477) // 08:39:17 → 16:36
  })

  it('with a work code: keeps the actual departure time within grace', () => {
    const { duration } = computeShiftDuration(
      at('2026-11-13T07:39:17Z'), at('2026-11-13T15:47:35Z'), '08:30', '16:36', 7.6, 0, false
    )
    expect(duration).toBe(488)
  })

  it('snapping defaults to on for existing callers', () => {
    const { duration } = computeShiftDuration(arrival, departure, '08:30', '16:36', 7.6)
    expect(duration).toBe(484)
  })
})
