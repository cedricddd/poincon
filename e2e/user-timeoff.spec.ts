import { test, expect } from '@playwright/test'
import { randomBytes } from 'crypto'
import { db } from './db'
import { signInAdmin, E2E_PASSWORD, E2E_TOTP_SECRET } from './auth-helpers'

// ALUNION case (Sentry, 21/11/2026): editing or deleting a leave from the employee page
// called methods the route no longer had (405, empty body → JSON.parse error).

const suffix = randomBytes(4).toString('hex')
const PREFIX = 'e2e-usertimeoff-'

type Fixture = { adminEmail: string; otherAdminEmail: string; adminId: string; employeeId: string; leaveId: string }
let fx: Fixture

const leave = (id: string) =>
  db<{ status: string; reason: string | null; approvedBy: string | null } | null>(
    `return prisma.timeOffRequest.findUnique({ where: { id: ARGS.id }, select: { status: true, reason: true, approvedBy: true } })`, { id })

test.use({ storageState: { cookies: [], origins: [] } })

test.describe.serial('Leave edited from the employee page', () => {
  test.beforeAll(() => {
    fx = db<Fixture>(`
      const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'BUSINESS' } })
      const password = await bcrypt.hash(ARGS.password, 10)
      const mkCompany = async (label, adminEmail) => {
        const admin = await prisma.user.create({ data: { email: adminEmail, name: 'Admin ' + label, password, role: 'ADMIN', twoFactorEnabled: true, twoFactorSecret: ARGS.secret } })
        const company = await prisma.company.create({ data: { name: 'E2E user timeoff ' + label, address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: admin.id, planId: plan.id, onboardingCompleted: true } })
        await prisma.user.update({ where: { id: admin.id }, data: { companyId: company.id } })
        return { admin, company }
      }
      const { admin, company } = await mkCompany('main', ARGS.adminEmail)
      await mkCompany('other', ARGS.otherAdminEmail)
      const employee = await prisma.user.create({ data: { email: ARGS.employeeEmail, name: 'Agent congé', password, role: 'EMPLOYEE', companyId: company.id } })
      const l = await prisma.timeOffRequest.create({ data: {
        userId: employee.id, startDate: new Date('2026-11-17T00:00:00Z'), endDate: new Date('2026-11-20T00:00:00Z'),
        leaveType: 'SICK', reason: 'En attente certificat', status: 'APPROVED', approvedBy: admin.id, approvedAt: new Date(),
      } })
      return { adminEmail: ARGS.adminEmail, otherAdminEmail: ARGS.otherAdminEmail, adminId: admin.id, employeeId: employee.id, leaveId: l.id }
    `, {
      password: E2E_PASSWORD,
      secret: E2E_TOTP_SECRET,
      adminEmail: `${PREFIX}admin-${suffix}@example.test`,
      otherAdminEmail: `${PREFIX}other-${suffix}@example.test`,
      employeeEmail: `${PREFIX}emp-${suffix}@example.test`,
    })
  })

  test.afterAll(() => {
    db(`
      const users = await prisma.user.findMany({ where: { email: { startsWith: ARGS.prefix, endsWith: '@example.test' } }, select: { id: true, companyId: true } })
      const userIds = users.map(u => u.id)
      const companyIds = [...new Set(users.map(u => u.companyId).filter(Boolean))]
      await prisma.timeOffRequest.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { companyId: null } })
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    `, { prefix: PREFIX })
  })

  test("another company's admin cannot edit the leave, and an unknown status is refused", async ({ page }) => {
    await signInAdmin(page, fx.otherAdminEmail)
    const foreign = await page.request.patch(`/api/admin/time-off/${fx.leaveId}`, { data: { startDate: '2026-11-17', endDate: '2026-11-20', status: 'REJECTED' } })
    expect(foreign.status()).toBe(404)
    expect((await page.request.delete(`/api/admin/time-off/${fx.leaveId}`)).status()).toBe(404)
    expect(leave(fx.leaveId)?.status).toBe('APPROVED')

    await page.context().clearCookies()
    await signInAdmin(page, fx.adminEmail)
    const bad = await page.request.patch(`/api/admin/time-off/${fx.leaveId}`, { data: { startDate: '2026-11-17', endDate: '2026-11-20', status: 'WHATEVER' } })
    expect(bad.status()).toBe(400)
  })

  test('the admin edits the status and the reason, then deletes the leave', async ({ page }) => {
    await signInAdmin(page, fx.adminEmail)
    await page.goto(`/fr/admin/dashboard/users/${fx.employeeId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Refuser' }).click({ timeout: 3000 }).catch(() => {}) // cookie banner
    await page.getByRole('button', { name: /^Congés/ }).click()

    await page.getByRole('button', { name: 'Modifier' }).click()
    const row = page.locator('tbody tr').filter({ has: page.getByRole('button', { name: 'Sauver' }) })
    await row.locator('select').selectOption('REJECTED')
    await row.locator('input:not([type])').fill('Certificat non reçu')
    const saved = page.waitForResponse(res => res.url().includes(`/api/admin/time-off/${fx.leaveId}`) && res.request().method() === 'PATCH')
    await row.getByRole('button', { name: 'Sauver' }).click()
    expect((await saved).status()).toBe(200)
    await expect(page.getByText('Rejeté').first()).toBeVisible()
    expect(leave(fx.leaveId)).toEqual({ status: 'REJECTED', reason: 'Certificat non reçu', approvedBy: fx.adminId })
    const audit = db<string | null>(`return (await prisma.auditLog.findFirst({ where: { resourceId: ARGS.id, action: 'admin_update' } }))?.changes ?? null`, { id: fx.leaveId })
    expect(JSON.parse(audit!).status).toEqual({ from: 'APPROVED', to: 'REJECTED' })

    page.once('dialog', d => d.accept())
    const deleted = page.waitForResponse(res => res.url().includes(`/api/admin/time-off/${fx.leaveId}`) && res.request().method() === 'DELETE')
    await page.getByRole('button', { name: 'Supprimer' }).click()
    expect((await deleted).status()).toBe(200)
    await expect(page.getByText('Certificat non reçu')).toHaveCount(0)
    expect(leave(fx.leaveId)).toBeNull()
  })
})
