import { describe, it, expect } from 'vitest'
import { netHoursBalance } from './balance'

describe('netHoursBalance', () => {
  it('is zero for an employee with only paid leave', () => {
    expect(netHoursBalance(0, 0)).toBe(0)
  })

  it('subtracts recovery taken from approved overtime', () => {
    expect(netHoursBalance(10, 2.5)).toBe(7.5)
  })

  it('goes negative when more recovery was taken than overtime earned', () => {
    expect(netHoursBalance(0, 5)).toBe(-5)
  })
})
