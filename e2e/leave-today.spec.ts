import { test, expect } from '@playwright/test'
import { randomBytes } from 'crypto'
import { db } from './db'
import { signIn } from './auth-helpers'

// Interreg case (20/11/2026): on approved leave, the clock screen kept asking to clock in.
// It now says "on leave" and only offers clocking in on purpose.

const suffix = randomBytes(4).toString('hex')
const PASSWORD = 'password123'
const EMAIL_PREFIX = 'e2e-leavetoday-'

// Leave dates are midnight UTC of the Brussels calendar day, end inclusive.
const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

type Fixture = { onLeaveEmail: string; pendingEmail: string }
let fx: Fixture

test.use({ storageState: { cookies: [], origins: [] } })

test.describe.serial('Clock screen on a day of leave', () => {
  test.beforeAll(() => {
    fx = db<Fixture>(`
      const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'BUSINESS' } })
      const password = await bcrypt.hash(ARGS.password, 10)
      const admin = await prisma.user.create({ data: { email: ARGS.adminEmail, name: 'Admin', password, role: 'ADMIN' } })
      const onLeave = await prisma.user.create({ data: { email: ARGS.onLeaveEmail, name: 'Agent en congé', password, role: 'EMPLOYEE' } })
      const pending = await prisma.user.create({ data: { email: ARGS.pendingEmail, name: 'Agent en attente', password, role: 'EMPLOYEE' } })
      const company = await prisma.company.create({ data: { name: 'E2E leave today', address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: admin.id, planId: plan.id, onboardingCompleted: true } })
      await prisma.user.updateMany({ where: { id: { in: [admin.id, onLeave.id, pending.id] } }, data: { companyId: company.id } })
      await prisma.timeOffRequest.create({ data: {
        userId: onLeave.id, startDate: new Date(ARGS.start), endDate: new Date(ARGS.end), leaveType: 'ANNUAL', status: 'APPROVED',
      } })
      await prisma.timeOffRequest.create({ data: {
        userId: pending.id, startDate: new Date(ARGS.start), endDate: new Date(ARGS.end), leaveType: 'ANNUAL', status: 'PENDING',
      } })
      return { onLeaveEmail: ARGS.onLeaveEmail, pendingEmail: ARGS.pendingEmail }
    `, {
      adminEmail: `${EMAIL_PREFIX}admin-${suffix}@example.test`,
      onLeaveEmail: `${EMAIL_PREFIX}on-${suffix}@example.test`,
      pendingEmail: `${EMAIL_PREFIX}pending-${suffix}@example.test`,
      password: PASSWORD,
      start: addDays(todayKey, -1),
      end: addDays(todayKey, 2),
    })
  })

  test.afterAll(() => {
    db(`
      const users = await prisma.user.findMany({
        where: { email: { startsWith: ARGS.prefix, endsWith: '@example.test' } },
        select: { id: true, companyId: true },
      })
      const userIds = users.map(u => u.id)
      const companyIds = [...new Set(users.map(u => u.companyId).filter(Boolean))]
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { companyId: null } })
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    `, { prefix: EMAIL_PREFIX })
  })

  test('approved leave replaces the clock-in button, which stays one click away', async ({ page }) => {
    await signIn(page, fx.onLeaveEmail, PASSWORD)
    const api = await (await page.request.get('/api/user/leave-today')).json()
    expect(api.leave).toEqual({ leaveType: 'ANNUAL', endDate: addDays(todayKey, 2) })

    await page.goto('/fr/app/clock')
    const card = page.getByTestId('leave-today')
    await expect(card).toBeVisible()
    await expect(card).toContainText("En congé aujourd'hui")
    await expect(page.getByRole('button', { name: /ARRIVÉE/i })).toHaveCount(0)
    await page.screenshot({ path: 'test-results/leave-today-card.png', fullPage: true })

    await page.getByRole('button', { name: /pointer/i }).click()
    await expect(page.getByRole('button', { name: /ARRIVÉE/i })).toBeVisible()
    await expect(card).toHaveCount(0)
  })

  test('pending leave changes nothing', async ({ page }) => {
    await signIn(page, fx.pendingEmail, PASSWORD)
    const api = await (await page.request.get('/api/user/leave-today')).json()
    expect(api.leave).toBeNull()

    await page.goto('/fr/app/clock')
    await expect(page.getByRole('button', { name: /ARRIVÉE/i })).toBeVisible()
    await expect(page.getByTestId('leave-today')).toHaveCount(0)
  })
})
