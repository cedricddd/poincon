import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setUserActive, isUserActive } from '@/lib/user-status'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { canAddEmployee, getActiveMemberCount } from '@/lib/plan'
import { syncSeatQuantitySafe } from '@/lib/billing'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/lib/plan', () => ({ canAddEmployee: vi.fn(), getActiveMemberCount: vi.fn() }))
vi.mock('@/lib/billing', () => ({ syncSeatQuantitySafe: vi.fn() }))

const findFirst = prisma.user.findFirst as ReturnType<typeof vi.fn>
const findUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>
const update = prisma.user.update as ReturnType<typeof vi.fn>
const companyFindUnique = prisma.company.findUnique as ReturnType<typeof vi.fn>
const canAdd = canAddEmployee as ReturnType<typeof vi.fn>
const memberCount = getActiveMemberCount as ReturnType<typeof vi.fn>

const base = { companyId: 'c1', actorId: 'admin1', targetId: 'u1' }

beforeEach(() => {
  vi.clearAllMocks()
  companyFindUnique.mockResolvedValue({ adminId: 'owner1' })
  memberCount.mockResolvedValue(3)
  canAdd.mockResolvedValue(true)
})

describe('setUserActive — deactivation', () => {
  it('flips the flag only, logs the action and resyncs billed seats', async () => {
    findFirst.mockResolvedValue({ id: 'u1', active: true })

    const result = await setUserActive({ ...base, active: false })

    expect(result).toEqual({ ok: true })
    // Nothing but `active` is written: clock records and the rest of the history stay untouched
    expect(update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { active: false } })
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'admin1', action: 'admin_deactivate_user', resourceId: 'u1',
    }))
    expect(syncSeatQuantitySafe).toHaveBeenCalledWith('c1')
  })

  it('only looks the target up inside the admin company', async () => {
    findFirst.mockResolvedValue(null)

    const result = await setUserActive({ ...base, active: false })

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'u1', companyId: 'c1', deletedAt: null },
    }))
    expect(result).toMatchObject({ ok: false, status: 404 })
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses self-deactivation', async () => {
    findFirst.mockResolvedValue({ id: 'admin1', active: true })

    const result = await setUserActive({ ...base, targetId: 'admin1', active: false })

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses to deactivate the company owner', async () => {
    findFirst.mockResolvedValue({ id: 'owner1', active: true })

    const result = await setUserActive({ ...base, targetId: 'owner1', active: false })

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(update).not.toHaveBeenCalled()
  })

  it('is a no-op when the account is already in the requested state', async () => {
    findFirst.mockResolvedValue({ id: 'u1', active: false })

    const result = await setUserActive({ ...base, active: false })

    expect(result).toEqual({ ok: true })
    expect(update).not.toHaveBeenCalled()
    expect(syncSeatQuantitySafe).not.toHaveBeenCalled()
  })
})

describe('setUserActive — reactivation', () => {
  it('reactivates and resyncs seats when the plan has room', async () => {
    findFirst.mockResolvedValue({ id: 'u1', active: false })

    const result = await setUserActive({ ...base, active: true })

    expect(result).toEqual({ ok: true })
    expect(canAdd).toHaveBeenCalledWith('c1', 3)
    expect(update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { active: true } })
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin_reactivate_user' }))
    expect(syncSeatQuantitySafe).toHaveBeenCalledWith('c1')
  })

  it('refuses when the plan hard cap is reached (FREE)', async () => {
    findFirst.mockResolvedValue({ id: 'u1', active: false })
    canAdd.mockResolvedValue(false)

    const result = await setUserActive({ ...base, active: true })

    expect(result).toMatchObject({ ok: false, status: 403 })
    expect(update).not.toHaveBeenCalled()
  })
})

describe('isUserActive', () => {
  it('is true for an active, non-deleted account', async () => {
    findUnique.mockResolvedValue({ active: true, deletedAt: null })
    expect(await isUserActive('u1')).toBe(true)
  })

  it('is false for a deactivated account', async () => {
    findUnique.mockResolvedValue({ active: false, deletedAt: null })
    expect(await isUserActive('u1')).toBe(false)
  })

  it('is false for a soft-deleted account', async () => {
    findUnique.mockResolvedValue({ active: true, deletedAt: new Date() })
    expect(await isUserActive('u1')).toBe(false)
  })

  it('is false for an unknown account', async () => {
    findUnique.mockResolvedValue(null)
    expect(await isUserActive('u1')).toBe(false)
  })
})
