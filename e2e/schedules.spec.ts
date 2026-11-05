import { test, expect, type Page } from '@playwright/test'
import { randomBytes } from 'crypto'
import { db } from './db'

const suffix = randomBytes(4).toString('hex')
const PASSWORD = 'password123'
const EMAIL_PREFIX = 'e2e-sched-'

type Fixture = { companyId: string; adminEmail: string; employeeId: string }

/** Company with an admin whose 2FA is trusted (no challenge) and one employee. */
function createCompany(label: string): Fixture {
  const adminEmail = `${EMAIL_PREFIX}${label}-admin-${suffix}@example.test`
  return db<Fixture>(`
    const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'BUSINESS' } })
    const password = await bcrypt.hash(ARGS.password, 10)
    const admin = await prisma.user.create({ data: {
      email: ARGS.adminEmail, name: 'Admin ' + ARGS.label, password, role: 'ADMIN',
      twoFactorEnabled: true, twoFactorTrustedUntil: new Date(Date.now() + 86400000),
    } })
    const employee = await prisma.user.create({ data: {
      email: ARGS.employeeEmail, name: 'Agent ' + ARGS.label, password, role: 'EMPLOYEE',
    } })
    const company = await prisma.company.create({ data: { name: 'E2E sched ' + ARGS.label, address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: admin.id, planId: plan.id, onboardingCompleted: true } })
    await prisma.user.updateMany({ where: { id: { in: [admin.id, employee.id] } }, data: { companyId: company.id } })
    return { companyId: company.id, adminEmail: ARGS.adminEmail, employeeId: employee.id }
  `, { label, adminEmail, employeeEmail: `${EMAIL_PREFIX}${label}-emp-${suffix}@example.test`, password: PASSWORD })
}

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.fill('input#email', email)
  await page.fill('input#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
}

const userHours = (userId: string) =>
  db<number>(`return (await prisma.userSchedule.findUnique({ where: { userId: ARGS.userId } }))?.hoursPerDay`, { userId })

let co: Fixture
let otherCo: Fixture

test.use({ storageState: { cookies: [], origins: [] } })

test.describe.serial('Schedule templates — unpaid break', () => {
  test.beforeAll(() => {
    co = createCompany('stc')
    otherCo = createCompany('other')
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
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } }) // cascades templates
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    `, { prefix: EMAIL_PREFIX })
  })

  test('break is taken off, hours follow the template and the form shows 7h36 / 38h', async ({ page }) => {
    await signIn(page, co.adminEmail)

    const created = await page.request.post('/api/admin/work-schedules', { data: {
      name: 'horaire STC', type: 'VARIABLE', startTime: '08:30', endTime: '16:36',
      daysOfWeek: [1, 2, 3, 4, 5], unpaidBreakMinutes: 30,
      hoursPerDay: 8, weeklyHours: 40, // client preview values are ignored
    } })
    expect(created.status()).toBe(201)
    const tpl = await created.json()
    expect(tpl.hoursPerDay).toBeCloseTo(7.6)
    expect(tpl.weeklyHours).toBe(38)

    const assigned = await page.request.patch('/api/admin/schedule', { data: { userId: co.employeeId, scheduleId: tpl.id } })
    expect(assigned.ok()).toBe(true)
    expect(userHours(co.employeeId)).toBeCloseTo(7.6)

    // Editing the template moves people already on it, without re-assigning them
    const edited = await page.request.patch('/api/admin/work-schedules', { data: { id: tpl.id, unpaidBreakMinutes: 45 } })
    expect(edited.ok()).toBe(true)
    expect(userHours(co.employeeId)).toBeCloseTo(441 / 60) // 7h21
    const audit = db<number>(`return prisma.auditLog.count({ where: { action: 'admin_update_schedule_template', resourceId: ARGS.id } })`, { id: tpl.id })
    expect(audit).toBe(1)

    await page.request.patch('/api/admin/work-schedules', { data: { id: tpl.id, unpaidBreakMinutes: 30 } })
    await page.goto('/fr/admin/dashboard/schedules')
    await page.getByRole('button', { name: 'Gabarits' }).click()
    await page.getByRole('button', { name: 'Modifier' }).first().click()
    await expect(page.getByLabel('Pause non rémunérée (minutes)')).toHaveValue('30')
    await expect(page.getByText('38h/sem · 7h36/j moy.')).toBeVisible()
    await page.screenshot({ path: 'test-results/schedules-unpaid-break.png', fullPage: true })
  })

  test('night shift counts 8 h and an invalid break is refused', async ({ page }) => {
    await signIn(page, co.adminEmail)
    const night = await page.request.post('/api/admin/work-schedules', { data: {
      name: 'nuit', type: 'NUIT', startTime: '22:00', endTime: '06:00', daysOfWeek: [1, 2, 3, 4, 5],
    } })
    expect((await night.json()).hoursPerDay).toBe(8)

    const bad = await page.request.post('/api/admin/work-schedules', { data: {
      name: 'x', type: 'JOURNEE', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 300,
    } })
    expect(bad.status()).toBe(400)
  })

  test("another company's admin cannot edit the template", async ({ page }) => {
    const id = db<string>(`return (await prisma.workSchedule.findFirst({ where: { companyId: ARGS.c, name: 'horaire STC' } })).id`, { c: co.companyId })
    await signIn(page, otherCo.adminEmail)
    const res = await page.request.patch('/api/admin/work-schedules', { data: { id, unpaidBreakMinutes: 0 } })
    expect(res.status()).toBe(404)
    expect(userHours(co.employeeId)).toBeCloseTo(7.6)
  })
})
