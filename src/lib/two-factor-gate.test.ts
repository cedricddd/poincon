import { describe, it, expect } from 'vitest'
import { apiBlockedForUnverifiedAdmin } from './two-factor-gate'

const unverifiedAdmin = { role: 'ADMIN', twoFactorVerified: false }

describe('apiBlockedForUnverifiedAdmin', () => {
  it('blocks an admin without the 2FA code on admin, manager, user and super-admin APIs', () => {
    for (const p of ['/api/admin/users', '/api/manager/approve', '/api/user/password', '/api/clock/record', '/api/super-admin/accounts']) {
      expect(apiBlockedForUnverifiedAdmin(p, unverifiedAdmin)).toBe(true)
    }
    expect(apiBlockedForUnverifiedAdmin('/api/super-admin/stats', { role: 'SUPER_ADMIN', twoFactorVerified: false })).toBe(true)
  })
  it('lets the 2FA pages and the public / machine routes through', () => {
    for (const p of ['/api/auth/2fa/challenge', '/api/auth/2fa/setup', '/api/qr/abc/clock', '/api/kiosk/tok/clock', '/api/cron/reminder', '/api/v1/clock-records', '/api/stripe/webhook']) {
      expect(apiBlockedForUnverifiedAdmin(p, unverifiedAdmin)).toBe(false)
    }
  })
  it('never blocks a verified admin, an employee, a manager or no session', () => {
    expect(apiBlockedForUnverifiedAdmin('/api/admin/users', { role: 'ADMIN', twoFactorVerified: true })).toBe(false)
    expect(apiBlockedForUnverifiedAdmin('/api/clock/record', { role: 'EMPLOYEE' })).toBe(false)
    expect(apiBlockedForUnverifiedAdmin('/api/manager/approve', { role: 'MANAGER' })).toBe(false)
    expect(apiBlockedForUnverifiedAdmin('/api/admin/users', null)).toBe(false)
  })
})
