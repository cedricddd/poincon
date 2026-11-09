import { test, expect } from '@playwright/test'
import { randomBytes } from 'crypto'
import ExcelJS from 'exceljs'
import { db } from './db'
import { signIn, signInAdmin, E2E_TOTP_SECRET } from './auth-helpers'

// Interreg case (06/11/2026): a 4/5 employee (Monday–Thursday, 08:30–16:36, 30 min unpaid break)
// on leave 9 → 19/11/2026 takes 7 working days, not 11 calendar days; a day clocked without
// a lunch break loses 30 min in the Boni/Mali export.

const suffix = randomBytes(4).toString('hex')
const PASSWORD = 'password123'
const EMAIL_PREFIX = 'e2e-leave-'

type Fixture = { companyId: string; adminEmail: string; employeeEmail: string; employeeId: string }

let fx: Fixture


test.use({ storageState: { cookies: [], origins: [] } })

test.describe.serial('Leave in working days + minimum break in Boni/Mali', () => {
  test.beforeAll(() => {
    fx = db<Fixture>(`
      const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'BUSINESS' } })
      const password = await bcrypt.hash(ARGS.password, 10)
      const admin = await prisma.user.create({ data: {
        email: ARGS.adminEmail, name: 'Admin leave', password, role: 'ADMIN',
        twoFactorEnabled: true, twoFactorSecret: ARGS.totpSecret,
      } })
      const employee = await prisma.user.create({ data: { email: ARGS.employeeEmail, name: 'Agent 4-5', password, role: 'EMPLOYEE' } })
      const company = await prisma.company.create({ data: { name: 'E2E leave', address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: admin.id, planId: plan.id, onboardingCompleted: true } })
      await prisma.user.updateMany({ where: { id: { in: [admin.id, employee.id] } }, data: { companyId: company.id } })
      await prisma.companyFeatureFlag.create({ data: { companyId: company.id, flag: 'work_rules', enabled: true } })
      const pr = await prisma.workMode.create({ data: { companyId: company.id, code: 'PR', label: 'Bureau', isDefault: true } })
      const ws = await prisma.workSchedule.create({ data: {
        companyId: company.id, name: 'STC 4/5', type: 'VARIABLE', startTime: '08:30', endTime: '16:36',
        hoursPerDay: 7.6, weeklyHours: 30.4, unpaidBreakMinutes: 30, daysOfWeek: '[1,2,3,4]',
      } })
      await prisma.userSchedule.create({ data: { userId: employee.id, hoursPerDay: 7.6, scheduleId: ws.id } })
      await prisma.timeOffRequest.create({ data: {
        userId: employee.id, startDate: new Date('2026-11-09'), endDate: new Date('2026-11-19'), leaveType: 'ANNUAL', status: 'APPROVED',
      } })
      // Monday 23/11: 08:30–16:36 Brussels (UTC+1), lunch not clocked
      await prisma.clockRecord.create({ data: {
        userId: employee.id, arrivalTime: new Date('2026-11-23T07:30:00Z'), departureTime: new Date('2026-11-23T15:36:00Z'),
        duration: 486, date: new Date('2026-11-23T07:30:00Z'), workModeId: pr.id,
      } })
      return { companyId: company.id, adminEmail: ARGS.adminEmail, employeeEmail: ARGS.employeeEmail, employeeId: employee.id }
    `, {
      adminEmail: `${EMAIL_PREFIX}admin-${suffix}@example.test`,
      employeeEmail: `${EMAIL_PREFIX}emp-${suffix}@example.test`,
      password: PASSWORD,
      totpSecret: E2E_TOTP_SECRET,
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

  test('employee sees 7 days, not 11', async ({ page }) => {
    await signIn(page, fx.employeeEmail)
    const list = await (await page.request.get('/api/time-off')).json()
    expect(list[0].days).toBe(7)
    const balance = await (await page.request.get('/api/user/balance')).json()
    expect(balance.daysOff).toBe(7)

    await page.goto('/fr/app/time-off')
    await expect(page.getByText('7 jours').first()).toBeVisible()
    await page.screenshot({ path: 'test-results/leave-days-employee.png', fullPage: true })
  })

  test('admin sees 7 days and the Boni/Mali export takes 30 min off the unclocked lunch', async ({ page }) => {
    await signInAdmin(page, fx.adminEmail)
    const detail = await (await page.request.get(`/api/admin/users/${fx.employeeId}`)).json()
    expect(detail.balance.timeOffDays).toBe(7)
    expect(detail.user.timeOffRequests[0].days).toBe(7)
    const requests = await (await page.request.get('/api/admin/requests')).json()
    expect(requests.timeOffs[0].days).toBe(7)

    const res = await page.request.get(`/api/admin/reports/export-xlsx?from=2026-11-23&to=2026-11-23&userId=${fx.employeeId}`)
    expect(res.status()).toBe(200)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await res.body() as unknown as ArrayBuffer)
    const sheet = wb.worksheets[1]
    const row = sheet.getRow(4)
    expect(String(row.getCell(15).value)).toContain('Pause minimum appliquée : 30 min retirées')
    expect(row.getCell(11).value).toBeNull() // no boni
  })
})
