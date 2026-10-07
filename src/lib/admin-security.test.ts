import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isSiteAllowedForUser } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    site: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

const siteFindUnique = prisma.site.findUnique as ReturnType<typeof vi.fn>
const userFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>

describe('isSiteAllowedForUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows no site', async () => {
    expect(await isSiteAllowedForUser(null, 'u1')).toBe(true)
    expect(await isSiteAllowedForUser(undefined, 'u1')).toBe(true)
    expect(siteFindUnique).not.toHaveBeenCalled()
  })

  it('allows a site of the employee company', async () => {
    siteFindUnique.mockResolvedValue({ companyId: 'c1' })
    userFindUnique.mockResolvedValue({ companyId: 'c1' })
    expect(await isSiteAllowedForUser('s1', 'u1')).toBe(true)
  })

  it('rejects a site of another company', async () => {
    siteFindUnique.mockResolvedValue({ companyId: 'c2' })
    userFindUnique.mockResolvedValue({ companyId: 'c1' })
    expect(await isSiteAllowedForUser('s1', 'u1')).toBe(false)
  })

  it('rejects an unknown site', async () => {
    siteFindUnique.mockResolvedValue(null)
    userFindUnique.mockResolvedValue({ companyId: 'c1' })
    expect(await isSiteAllowedForUser('nope', 'u1')).toBe(false)
  })

  it('rejects when the employee has no company', async () => {
    siteFindUnique.mockResolvedValue({ companyId: 'c1' })
    userFindUnique.mockResolvedValue({ companyId: null })
    expect(await isSiteAllowedForUser('s1', 'u1')).toBe(false)
  })
})
