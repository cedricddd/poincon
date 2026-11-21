import { test, expect } from '@playwright/test'
import { randomBytes } from 'crypto'
import { db } from './db'
import { signInAdmin, E2E_PASSWORD, E2E_TOTP_SECRET } from './auth-helpers'

// ALUNION request (21/11/2026): an admin could not add a meal break an employee forgot
// to clock. The admin now adds (or removes) it on the employee page; the total follows.

const suffix = randomBytes(4).toString('hex')
const PREFIX = 'e2e-adminbreak-'

type Fixture = { adminEmail: string; otherAdminEmail: string; employeeId: string; recordId: string; day: string }
let fx: Fixture

const record = (id: string) =>
  db<{ duration: number; editReason: string | null; breaks: { id: string }[] }>(
    `return prisma.clockRecord.findUnique({ where: { id: ARGS.id }, select: { duration: true, editReason: true, breaks: { select: { id: true } } } })`, { id })

test.use({ storageState: { cookies: [], origins: [] } })

test.describe.serial('Admin adds a forgotten meal break', () => {
  test.beforeAll(() => {
    // A past weekday, 08:00–16:30 Brussels (07:00–15:30 UTC in winter): 510 min, no break
    const day = '2026-11-16'
    fx = db<Fixture>(`
      const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'BUSINESS' } })
      const password = await bcrypt.hash(ARGS.password, 10)
      const mkCompany = async (label, adminEmail) => {
        const admin = await prisma.user.create({ data: { email: adminEmail, name: 'Admin ' + label, password, role: 'ADMIN', twoFactorEnabled: true, twoFactorSecret: ARGS.secret } })
        const company = await prisma.company.create({ data: { name: 'E2E admin break ' + label, address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: admin.id, planId: plan.id, onboardingCompleted: true } })
        await prisma.user.update({ where: { id: admin.id }, data: { companyId: company.id } })
        return company
      }
      const company = await mkCompany('main', ARGS.adminEmail)
      await mkCompany('other', ARGS.otherAdminEmail)
      const employee = await prisma.user.create({ data: { email: ARGS.employeeEmail, name: 'Agent pause', password, role: 'EMPLOYEE', companyId: company.id } })
      const r = await prisma.clockRecord.create({ data: {
        userId: employee.id, date: new Date(ARGS.day + 'T00:00:00Z'),
        arrivalTime: new Date(ARGS.day + 'T07:00:00Z'), departureTime: new Date(ARGS.day + 'T15:30:00Z'),
        duration: 510, location: 'Sur site',
      } })
      return { adminEmail: ARGS.adminEmail, otherAdminEmail: ARGS.otherAdminEmail, employeeId: employee.id, recordId: r.id, day: ARGS.day }
    `, {
      day,
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
      await prisma.clockRecord.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { companyId: null } })
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    `, { prefix: PREFIX })
  })

  test('the admin adds 12:00–12:30 from the employee page: 8h30 becomes 8h', async ({ page }) => {
    await signInAdmin(page, fx.adminEmail)
    await page.goto(`/fr/admin/dashboard/users/${fx.employeeId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Refuser' }).click({ timeout: 3000 }).catch(() => {}) // cookie banner
    await page.getByRole('button', { name: /^Pointages/ }).click()

    await page.getByRole('button', { name: '+ Pause' }).click()
    const form = page.getByTestId('add-break')
    await form.getByLabel('Début de la pause').fill('12:00')
    await form.getByLabel('Fin de la pause').fill('12:30')
    await form.getByRole('button', { name: 'Ajouter la pause' }).click()

    // Reason modal, preset on the forgotten break
    await expect(page.locator('select').filter({ has: page.locator('option[value="forgot_break"]') })).toHaveValue('forgot_break')
    const posted = page.waitForResponse(res => res.url().includes(`/api/admin/clock-records/${fx.recordId}/breaks`) && res.request().method() === 'POST')
    await page.getByRole('button', { name: 'Confirmer' }).click()
    expect((await posted).status()).toBe(201)

    // The duration cell shows the new total and the break under it
    const durationCell = page.locator('td').filter({ hasText: 'Pause 12:00–12:30' })
    await expect(durationCell).toBeVisible()
    await expect(durationCell).toContainText(/^8h(?!\d)/)
    await page.screenshot({ path: 'test-results/admin-break-added.png', fullPage: true })

    const r = record(fx.recordId)
    expect(r.duration).toBe(480)
    expect(r.editReason).toBe('forgot_break')
    expect(r.breaks).toHaveLength(1)
    const audit = db<string | null>(`return (await prisma.auditLog.findFirst({ where: { resourceId: ARGS.id, action: 'admin_add_break' } }))?.changes ?? null`, { id: fx.recordId })
    expect(JSON.parse(audit!)).toMatchObject({ reason: 'forgot_break', before: { duration: 510, breaks: [] }, after: { duration: 480, breaks: ['12:00–12:30'] } })
  })

  test('an overlapping or out-of-record break is refused', async ({ page }) => {
    await signInAdmin(page, fx.adminEmail)
    const url = `/api/admin/clock-records/${fx.recordId}/breaks`
    const overlap = await page.request.post(url, { data: { startedAt: `${fx.day}T11:15:00Z`, endedAt: `${fx.day}T11:45:00Z` } })
    expect(overlap.status()).toBe(400)
    expect((await overlap.json()).error).toMatch(/chevauche/)
    const outside = await page.request.post(url, { data: { startedAt: `${fx.day}T16:00:00Z`, endedAt: `${fx.day}T16:30:00Z` } })
    expect(outside.status()).toBe(400)
    const noNote = await page.request.post(url, { data: { startedAt: `${fx.day}T09:00:00Z`, endedAt: `${fx.day}T09:10:00Z`, reason: 'other' } })
    expect(noNote.status()).toBe(400)
    expect(record(fx.recordId).duration).toBe(480)
  })

  test("another company's admin can neither add nor remove a break", async ({ page }) => {
    const breakId = record(fx.recordId).breaks[0].id
    await signInAdmin(page, fx.otherAdminEmail)
    const url = `/api/admin/clock-records/${fx.recordId}/breaks`
    expect((await page.request.post(url, { data: { startedAt: `${fx.day}T09:00:00Z`, endedAt: `${fx.day}T09:10:00Z` } })).status()).toBe(404)
    expect((await page.request.delete(`${url}?breakId=${breakId}`)).status()).toBe(404)
    expect(record(fx.recordId).breaks).toHaveLength(1)
  })

  test('the admin removes the break: back to 8h30', async ({ page }) => {
    await signInAdmin(page, fx.adminEmail)
    await page.goto(`/fr/admin/dashboard/users/${fx.employeeId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Refuser' }).click({ timeout: 3000 }).catch(() => {})
    await page.getByRole('button', { name: /^Pointages/ }).click()

    page.once('dialog', d => d.accept())
    await page.getByRole('button', { name: 'Retirer cette pause' }).click()
    const removed = page.waitForResponse(res => res.url().includes(`/api/admin/clock-records/${fx.recordId}/breaks`) && res.request().method() === 'DELETE')
    await page.getByRole('button', { name: 'Confirmer' }).click()
    expect((await removed).status()).toBe(200)

    await expect(page.getByText('Pause 12:00–12:30')).toHaveCount(0)
    const r = record(fx.recordId)
    expect(r.duration).toBe(510)
    expect(r.breaks).toHaveLength(0)
  })
})
