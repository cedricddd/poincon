import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { leaveDayKey } from './leave-today'

describe('leaveDayKey', () => {
  it('winter: 00:30 Brussels is still that calendar day (UTC is the day before)', () => {
    expect(leaveDayKey(new Date('2026-11-18T23:30:00Z')).toISOString()).toBe('2026-11-19T00:00:00.000Z')
  })

  it('winter: 23:30 Brussels stays on that calendar day', () => {
    expect(leaveDayKey(new Date('2026-11-19T22:30:00Z')).toISOString()).toBe('2026-11-19T00:00:00.000Z')
  })

  it('summer: 00:30 Brussels (UTC+2) maps to that calendar day', () => {
    expect(leaveDayKey(new Date('2026-07-14T22:30:00Z')).toISOString()).toBe('2026-07-15T00:00:00.000Z')
  })

  it('summer: 23:30 Brussels stays on that calendar day', () => {
    expect(leaveDayKey(new Date('2026-07-15T21:30:00Z')).toISOString()).toBe('2026-07-15T00:00:00.000Z')
  })
})
