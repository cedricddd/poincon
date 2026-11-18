import { describe, it, expect, vi } from 'vitest'
import { parseWorkModeInput, checkDepartureAllowed } from '@/lib/work-modes'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

describe('parseWorkModeInput — requireOnSiteDeparture', () => {
  it('keeps the flag only when it is exactly true', () => {
    const on = parseWorkModeInput({ code: 'MAG', label: 'Magasin', requireOnSiteDeparture: true })
    const off = parseWorkModeInput({ code: 'MAG', label: 'Magasin', requireOnSiteDeparture: 'yes' })
    expect('data' in on && on.data.requireOnSiteDeparture).toBe(true)
    expect('data' in off && off.data.requireOnSiteDeparture).toBe(false)
  })
})

describe('checkDepartureAllowed', () => {
  const MAG = { code: 'MAG', label: 'Magasin', requireOnSiteDeparture: true }

  it('returns a 422 DEPARTURE_ON_SITE_ONLY for the app button', () => {
    const refused = checkDepartureAllowed(MAG, false)
    expect(refused?.status).toBe(422)
    expect(refused?.body.code).toBe('DEPARTURE_ON_SITE_ONLY')
    expect(refused?.body.workMode).toEqual({ code: 'MAG', label: 'Magasin' })
  })

  it('allows the departure on site, without the rule, or without a code', () => {
    expect(checkDepartureAllowed(MAG, true)).toBeNull()
    expect(checkDepartureAllowed({ ...MAG, requireOnSiteDeparture: false }, false)).toBeNull()
    expect(checkDepartureAllowed(null, false)).toBeNull()
  })
})
