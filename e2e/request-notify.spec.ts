import { test, expect } from '@playwright/test'
import { randomBytes } from 'crypto'
import { db } from './db'
import { signIn, signInAdmin, E2E_PASSWORD, E2E_TOTP_SECRET } from './auth-helpers'

// ALUNION request (21/11/2026): admins want to hear about employee requests without
// watching the app. Bell for every reviewer; e-mail only for those who ticked the box.

const suffix = randomBytes(4).toString('hex')
const PREFIX = 'e2e-reqnotify-'

type Fixture = { optedInId: string; otherAdminId: string; otherAdminEmail: string; employeeEmail: string }
let fx: Fixture

const bells = (userId: string) =>
  db<string[]>(`return (await prisma.notification.findMany({ where: { userId: ARGS.userId }, orderBy: { createdAt: 'asc' } })).map(n => n.message)`, { userId })

test.use({ storageState: { cookies: [], origins: [] } })

test.describe.serial('Employee requests notify the reviewers', () => {
  test.beforeAll(() => {
    fx = db<Fixture>(`
      const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'BUSINESS' } })
      const password = await bcrypt.hash(ARGS.password, 10)
      const admin = (email, name, emailOnRequests) => prisma.user.create({ data: { email, name, password, role: 'ADMIN', twoFactorEnabled: true, twoFactorSecret: ARGS.secret, emailOnRequests } })
      const optedIn = await admin(ARGS.optedInEmail, 'Admin mail', true)
      const other = await admin(ARGS.otherAdminEmail, 'Admin cloche', false)
      const emp = await prisma.user.create({ data: { email: ARGS.employeeEmail, name: 'Marie Demande', password, role: 'EMPLOYEE' } })
      const company = await prisma.company.create({ data: { name: 'E2E req notify', address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: optedIn.id, planId: plan.id, onboardingCompleted: true } })
      await prisma.user.updateMany({ where: { id: { in: [optedIn.id, other.id, emp.id] } }, data: { companyId: company.id } })
      return { optedInId: optedIn.id, otherAdminId: other.id, otherAdminEmail: ARGS.otherAdminEmail, employeeEmail: ARGS.employeeEmail }
    `, {
      password: E2E_PASSWORD,
      secret: E2E_TOTP_SECRET,
      optedInEmail: `${PREFIX}optin-${suffix}@example.test`,
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
      await prisma.rTTRequest.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.clockCorrectionRequest.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { companyId: null } })
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    `, { prefix: PREFIX })
  })

  test('leave, time off in lieu and missed clocking each reach both admins in the bell', async ({ page }) => {
    await signIn(page, fx.employeeEmail)
    const leave = await page.request.post('/api/time-off', { data: { startDate: '2026-12-21', endDate: '2026-12-23', leaveType: 'ANNUAL', reason: 'vacances' } })
    expect(leave.status()).toBe(201)
    const rtt = await page.request.post('/api/rtt', { data: { date: '2026-12-28', hoursToRecover: 3.5, reason: '' } })
    expect(rtt.status()).toBe(201)
    const correction = await page.request.post('/api/clock-corrections', { data: { date: '2026-11-20', requestedArrival: '2026-11-20T07:30:00Z', reason: 'forgot_clockin' } })
    expect(correction.status()).toBe(201)

    for (const id of [fx.optedInId, fx.otherAdminId]) {
      expect(bells(id)).toEqual([
        'Marie Demande demande un congé (Congé annuel) du 21/12/2026 au 23/12/2026.',
        'Marie Demande demande une récupération de 3,5 h le 28/12/2026.',
        'Marie Demande signale un oubli de pointage pour le 20/11/2026.',
      ])
    }
  })

  test('an employee neither sees the setting nor can change it', async ({ page }) => {
    await signIn(page, fx.employeeEmail)
    const prefs = await (await page.request.get('/api/user/notification-prefs')).json()
    expect(prefs).toEqual({ canReview: false, emailOnRequests: false })
    expect((await page.request.patch('/api/user/notification-prefs', { data: { emailOnRequests: true } })).status()).toBe(403)
    await page.goto('/fr/app/profile')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('request-emails')).toHaveCount(0)
  })

  test('an admin ticks the box in My profile', async ({ page }) => {
    await signInAdmin(page, fx.otherAdminEmail)
    await page.goto('/fr/app/profile')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Refuser' }).click({ timeout: 3000 }).catch(() => {}) // cookie banner
    // With unread notifications (the 3 requests above) the bell opens itself for 5 s and covers the page
    await expect(page.getByText(/non lues?$/)).toBeHidden({ timeout: 10_000 })
    const card = page.getByTestId('request-emails')
    const box = card.getByRole('checkbox', { name: /Recevoir un e-mail à chaque nouvelle demande/ })
    await expect(box).not.toBeChecked()

    const saved = page.waitForResponse(res => res.url().includes('/api/user/notification-prefs') && res.request().method() === 'PATCH')
    await box.check()
    expect((await saved).status()).toBe(200)
    await expect(card.getByText('Activé : vous recevrez un e-mail à chaque nouvelle demande.')).toBeVisible()
    await page.screenshot({ path: 'test-results/request-emails-profile.png', fullPage: true })
    expect(db<boolean>(`return (await prisma.user.findUnique({ where: { id: ARGS.id } })).emailOnRequests`, { id: fx.otherAdminId })).toBe(true)

    // Still ticked after a reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('request-emails').getByRole('checkbox')).toBeChecked()
  })
})
