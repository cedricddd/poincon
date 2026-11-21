import { describe, it, expect, vi, beforeEach } from 'vitest'

const prisma = {
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  teamMember: { findMany: vi.fn() },
  notification: { createMany: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma }))
const getCompanyPlan = vi.fn()
vi.mock('@/lib/plan', () => ({
  getCompanyPlan: (...a: unknown[]) => getCompanyPlan(...a),
  planCanAccess: (plan: string, feature: string) => feature === 'managers' && plan !== 'FREE' && plan !== 'STARTER',
}))
const sendRequestNotificationEmail = vi.fn()
vi.mock('@/lib/mail', () => ({ sendRequestNotificationEmail: (...a: unknown[]) => sendRequestNotificationEmail(...a) }))
// Translations: return the key and its values, enough to check what is said
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { namespace: string }) =>
    (key: string, values?: Record<string, string>) => `${namespace}.${key}${values ? JSON.stringify(values) : ''}`,
}))

const { findRequestReviewers, notifyRequestReviewers, describeRequest } = await import('./request-notify')

const reviewer = (id: string, emailOnRequests = false, locale: string | null = null) =>
  ({ id, email: `${id}@x.test`, name: id, locale, emailOnRequests })

beforeEach(() => {
  vi.clearAllMocks()
  prisma.user.findUnique.mockResolvedValue({ name: 'Marie', email: 'marie@x.test', companyId: 'co', managerId: null })
  prisma.user.findMany.mockResolvedValue([reviewer('admin1', true), reviewer('admin2', false)])
  prisma.teamMember.findMany.mockResolvedValue([])
  getCompanyPlan.mockResolvedValue('BUSINESS')
  sendRequestNotificationEmail.mockResolvedValue(undefined)
})

describe('findRequestReviewers', () => {
  it('admins review every request; the employee is excluded from the admin query', async () => {
    const found = await findRequestReviewers('emp')
    expect(found?.reviewers.map(r => [r.id, r.asAdmin])).toEqual([['admin1', true], ['admin2', true]])
    expect(prisma.user.findMany.mock.calls[0][0].where.id).toEqual({ not: 'emp' })
  })

  it('adds team managers and the direct manager, without duplicating an admin', async () => {
    prisma.user.findUnique.mockResolvedValue({ name: 'Marie', email: 'm@x.test', companyId: 'co', managerId: 'direct' })
    prisma.teamMember.findMany
      .mockResolvedValueOnce([{ teamId: 't1' }])
      .mockResolvedValueOnce([{ userId: 'mgr' }, { userId: 'admin1' }, { userId: 'emp' }])
    prisma.user.findMany
      .mockResolvedValueOnce([reviewer('admin1', true)])
      .mockResolvedValueOnce([reviewer('mgr', true), reviewer('direct')])
    const found = await findRequestReviewers('emp')
    expect(found?.reviewers.map(r => [r.id, r.asAdmin])).toEqual([['admin1', true], ['mgr', false], ['direct', false]])
    // Only the managers not already reviewing as admin, never the employee
    expect(prisma.user.findMany.mock.calls[1][0].where.id).toEqual({ in: ['mgr', 'direct'] })
  })

  it('ignores managers when the plan has no managers', async () => {
    getCompanyPlan.mockResolvedValue('STARTER')
    prisma.user.findUnique.mockResolvedValue({ name: 'Marie', email: 'm@x.test', companyId: 'co', managerId: 'direct' })
    const found = await findRequestReviewers('emp')
    expect(found?.reviewers.map(r => r.id)).toEqual(['admin1', 'admin2'])
    expect(prisma.teamMember.findMany).not.toHaveBeenCalled()
  })

  it('returns null for a user without company', async () => {
    prisma.user.findUnique.mockResolvedValue({ name: null, email: 'x', companyId: null, managerId: null })
    expect(await findRequestReviewers('emp')).toBeNull()
  })
})

describe('notifyRequestReviewers', () => {
  const leave = { kind: 'timeoff' as const, leaveType: 'ANNUAL', start: new Date('2026-11-24T00:00:00Z'), end: new Date('2026-11-26T00:00:00Z') }

  it('bell for every reviewer, e-mail only for those who opted in', async () => {
    const { emails } = await notifyRequestReviewers('emp', leave)
    await emails
    const bells = prisma.notification.createMany.mock.calls[0][0].data
    expect(bells.map((b: { userId: string }) => b.userId)).toEqual(['admin1', 'admin2'])
    expect(bells[0].message).toMatch(/^Marie emails\.request\.lineTimeoff/)
    expect(sendRequestNotificationEmail).toHaveBeenCalledTimes(1)
    expect(sendRequestNotificationEmail.mock.calls[0][0]).toMatchObject({
      to: 'admin1@x.test', employee: 'Marie', kind: 'timeoff', path: '/admin/dashboard/timeoffs', locale: 'fr',
    })
  })

  it('a manager is sent to the manager dashboard, in their language', async () => {
    prisma.user.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([reviewer('mgr', true, 'nl')])
    prisma.user.findUnique.mockResolvedValue({ name: 'Marie', email: 'm@x.test', companyId: 'co', managerId: 'mgr' })
    const { emails } = await notifyRequestReviewers('emp', { kind: 'rtt', date: new Date('2026-11-25T00:00:00Z'), hours: 3.5 })
    await emails
    expect(sendRequestNotificationEmail.mock.calls[0][0]).toMatchObject({ to: 'mgr@x.test', path: '/manager/dashboard', locale: 'nl' })
  })

  it('never throws: an SMTP failure or a DB failure is only logged', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    sendRequestNotificationEmail.mockRejectedValue(new Error('SMTP down'))
    const { emails } = await notifyRequestReviewers('emp', leave)
    await expect(emails).resolves.toBeUndefined()

    prisma.notification.createMany.mockRejectedValue(new Error('DB down'))
    await expect(notifyRequestReviewers('emp', leave)).resolves.toBeDefined()
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('describeRequest', () => {
  it('one-day leave, several days, time off in lieu with a decimal comma, missed clocking', async () => {
    const day = new Date('2026-11-24T00:00:00Z')
    expect(await describeRequest({ kind: 'timeoff', leaveType: 'SICK', start: day, end: day }, 'fr'))
      .toBe('emails.request.lineTimeoffOneDay{"type":"timeoff.typeSick","date":"24/11/2026"}')
    expect(await describeRequest({ kind: 'timeoff', leaveType: 'ANNUAL', start: day, end: new Date('2026-11-26T00:00:00Z') }, 'fr'))
      .toContain('"from":"24/11/2026","to":"26/11/2026"')
    expect(await describeRequest({ kind: 'rtt', date: day, hours: 3.5 }, 'fr')).toContain('"hours":"3,5"')
    expect(await describeRequest({ kind: 'correction', date: day }, 'fr')).toBe('emails.request.lineCorrection{"date":"24/11/2026"}')
  })
})
