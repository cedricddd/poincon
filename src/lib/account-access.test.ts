import { describe, it, expect, vi } from 'vitest'
import { isAccountUsable } from '@/lib/account-access'

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }))

const base = { active: true, deletedAt: null, companyMember: { deletedAt: null } }

describe('isAccountUsable', () => {
  it('accepts an active member of a live company', () => {
    expect(isAccountUsable(base)).toBe(true)
  })

  it('accepts a user without company (super-admin)', () => {
    expect(isAccountUsable({ ...base, companyMember: null })).toBe(true)
  })

  it('rejects a missing user', () => {
    expect(isAccountUsable(null)).toBe(false)
  })

  it('rejects a deactivated user', () => {
    expect(isAccountUsable({ ...base, active: false })).toBe(false)
  })

  it('rejects a soft-deleted user', () => {
    expect(isAccountUsable({ ...base, deletedAt: new Date() })).toBe(false)
  })

  it('rejects a member of a soft-deleted company', () => {
    expect(isAccountUsable({ ...base, companyMember: { deletedAt: new Date() } })).toBe(false)
  })
})
