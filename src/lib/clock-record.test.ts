import { describe, it, expect, vi } from 'vitest'
import { computeDuration, validateBreak, isValidEditReason } from './clock-record'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

const at = (hhmm: string) => new Date(`2026-11-20T${hhmm}:00Z`)
const closed = { arrivalTime: at('08:00'), departureTime: at('16:30') }

describe('computeDuration', () => {
  it('takes every closed break off the time between arrival and departure', () => {
    const breaks = [
      { startedAt: at('10:00'), endedAt: at('10:15') },
      { startedAt: at('12:00'), endedAt: at('12:30') },
    ]
    expect(computeDuration(at('08:00'), at('16:30'), breaks)).toBe(510 - 45)
  })

  it('is null while the record is open', () => {
    expect(computeDuration(at('08:00'), null, [])).toBeNull()
  })
})

describe('validateBreak', () => {
  it('accepts a meal break inside the record', () => {
    expect(validateBreak(closed, at('12:00'), at('12:30'), [])).toBeNull()
  })

  it('refuses an end before the start', () => {
    expect(validateBreak(closed, at('12:30'), at('12:00'), [])).toMatch(/après son début/)
  })

  it('refuses a break outside the record', () => {
    expect(validateBreak(closed, at('07:30'), at('08:15'), [])).toMatch(/entre l'arrivée et le départ/)
    expect(validateBreak(closed, at('16:15'), at('16:45'), [])).toMatch(/entre l'arrivée et le départ/)
  })

  it('refuses a break that overlaps one already recorded', () => {
    const existing = [{ startedAt: at('12:00'), endedAt: at('12:30') }]
    expect(validateBreak(closed, at('12:15'), at('12:45'), existing)).toMatch(/chevauche/)
    // Back to back is fine
    expect(validateBreak(closed, at('12:30'), at('12:45'), existing)).toBeNull()
  })

  it('refuses more than 4 hours', () => {
    expect(validateBreak(closed, at('08:30'), at('12:31'), [])).toMatch(/4 heures/)
  })

  it('on an open record, the break must be over (before now)', () => {
    const open = { arrivalTime: at('08:00'), departureTime: null }
    expect(validateBreak(open, at('12:00'), at('12:30'), [], at('13:00'))).toBeNull()
    expect(validateBreak(open, at('12:00'), at('13:30'), [], at('13:00'))).toMatch(/terminée/)
  })

  it('an open break counts as running until now', () => {
    const open = { arrivalTime: at('08:00'), departureTime: null }
    const running = [{ startedAt: at('12:00'), endedAt: null }]
    expect(validateBreak(open, at('12:10'), at('12:20'), running, at('12:40'))).toMatch(/chevauche/)
  })

  it('refuses invalid dates', () => {
    expect(validateBreak(closed, new Date('x'), at('12:00'), [])).toMatch(/invalides/)
  })
})

describe('forgot_break reason', () => {
  it('is an accepted edit reason', () => {
    expect(isValidEditReason('forgot_break')).toBe(true)
  })
})
