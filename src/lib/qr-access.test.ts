import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveQrAccess } from '@/lib/qr-access'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockFindUser = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>

const COMPANY = 'company-a'
const member = { id: 'u1', name: 'Patrick Renard', companyId: COMPANY, active: true, deletedAt: null }

function signedInAs(user: typeof member | null, twoFactor = { enabled: false, verified: false }) {
  mockAuth.mockResolvedValue(user ? {
    user: { id: user.id, twoFactorEnabled: twoFactor.enabled, twoFactorVerified: twoFactor.verified },
  } : null)
  mockFindUser.mockResolvedValue(user)
}

describe('resolveQrAccess', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks a device signed in to another company, whatever the setting', async () => {
    signedInAs({ ...member, companyId: 'company-b' })
    expect(await resolveQrAccess({ id: COMPANY, qrAccountOnly: false })).toEqual({ kind: 'other_company' })
    expect(await resolveQrAccess({ id: COMPANY, qrAccountOnly: true })).toEqual({ kind: 'other_company' })
  })

  it('keeps the PIN flow for a same-company session when accounts are not required', async () => {
    signedInAs(member)
    expect(await resolveQrAccess({ id: COMPANY, qrAccountOnly: false })).toEqual({ kind: 'pin' })
  })

  it('keeps the anonymous PIN flow when nobody is signed in (default setting)', async () => {
    signedInAs(null)
    expect(await resolveQrAccess({ id: COMPANY, qrAccountOnly: false })).toEqual({ kind: 'pin' })
  })

  it('uses the session identity when accounts are required', async () => {
    signedInAs(member)
    expect(await resolveQrAccess({ id: COMPANY, qrAccountOnly: true }))
      .toEqual({ kind: 'account', user: { id: 'u1', name: 'Patrick Renard' } })
  })

  it('requires login when accounts are required and nobody is signed in', async () => {
    signedInAs(null)
    expect(await resolveQrAccess({ id: COMPANY, qrAccountOnly: true })).toEqual({ kind: 'login_required' })
  })

  it('requires login when 2FA is enabled but not verified', async () => {
    signedInAs(member, { enabled: true, verified: false })
    expect(await resolveQrAccess({ id: COMPANY, qrAccountOnly: true })).toEqual({ kind: 'login_required' })
  })

  it('ignores a deactivated session user', async () => {
    signedInAs({ ...member, companyId: 'company-b', active: false })
    expect(await resolveQrAccess({ id: COMPANY, qrAccountOnly: false })).toEqual({ kind: 'pin' })
  })
})
