import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { findUsersByPin } from '@/lib/kiosk-pin'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: vi.fn() } },
}))

const mockFindMany = prisma.user.findMany as unknown as ReturnType<typeof vi.fn>

const hash = (pin: string) => bcrypt.hashSync(pin, 4)
const users = [
  { id: 'u1', name: 'Anne', kioskPin: hash('1234') },
  { id: 'u2', name: 'Bruno', kioskPin: hash('5678') },
  { id: 'u3', name: null, kioskPin: hash('5678') },
]

describe('findUsersByPin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindMany.mockResolvedValue(users)
  })

  it('returns no match for an unknown PIN', async () => {
    expect(await findUsersByPin('c1', '0000')).toEqual([])
  })

  it('returns the single matching employee', async () => {
    expect(await findUsersByPin('c1', '1234')).toEqual([{ id: 'u1', name: 'Anne' }])
  })

  it('returns every employee sharing the PIN', async () => {
    expect(await findUsersByPin('c1', '5678')).toEqual([
      { id: 'u2', name: 'Bruno' },
      { id: 'u3', name: 'Employé' },
    ])
  })

  it('scopes the query to the company and excludes the given user', async () => {
    await findUsersByPin('c1', '1234', { excludeUserId: 'u2' })
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: 'c1', active: true, deletedAt: null, id: { not: 'u2' } }),
    }))
  })
})
