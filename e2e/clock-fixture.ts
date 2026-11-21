import { expect, type Browser, type Page } from '@playwright/test'
import { randomBytes } from 'crypto'
import { db } from './db'
import { signIn, E2E_PASSWORD } from './auth-helpers'

// Clock specs each get their own employee in their own company. Sharing the dev admin made
// the specs depend on each other (run in parallel, open records left behind) and polluted
// the admin's real history.

export type ClockEmployee = { email: string; userId: string }

export function createClockEmployee(prefix: string): ClockEmployee {
  const suffix = randomBytes(4).toString('hex')
  return db<ClockEmployee>(`
    const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'BUSINESS' } })
    const password = await bcrypt.hash(ARGS.password, 10)
    const admin = await prisma.user.create({ data: { email: ARGS.adminEmail, name: 'Admin clock', password, role: 'ADMIN' } })
    const emp = await prisma.user.create({ data: { email: ARGS.email, name: 'Agent clock', password, role: 'EMPLOYEE' } })
    const company = await prisma.company.create({ data: { name: 'E2E clock ' + ARGS.suffix, address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: admin.id, planId: plan.id, onboardingCompleted: true } })
    await prisma.user.updateMany({ where: { id: { in: [admin.id, emp.id] } }, data: { companyId: company.id } })
    return { email: ARGS.email, userId: emp.id }
  `, {
    password: E2E_PASSWORD,
    suffix,
    adminEmail: `${prefix}admin-${suffix}@example.test`,
    email: `${prefix}emp-${suffix}@example.test`,
  })
}

/** Removes the employee's clock records, so each test starts before the arrival. */
export function resetClockDay(userId: string) {
  db(`await prisma.clockRecord.deleteMany({ where: { userId: ARGS.userId } })`, { userId })
}

export function deleteClockCompanies(prefix: string) {
  db(`
    const users = await prisma.user.findMany({ where: { email: { startsWith: ARGS.prefix, endsWith: '@example.test' } }, select: { id: true, companyId: true } })
    const userIds = users.map(u => u.id)
    const companyIds = [...new Set(users.map(u => u.companyId).filter(Boolean))]
    await prisma.clockRecord.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { companyId: null } })
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  `, { prefix })
}

/** Signs in once per spec file: logins are rate limited per IP (50 per 15 min). */
export async function saveSession(browser: Browser, email: string, path: string) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await signIn(page, email)
  await context.storageState({ path })
  await context.close()
}

/**
 * Opens the clock screen once React has taken over. The button is in the server HTML,
 * so a click before hydration (slow in dev) does nothing, and the first load of the day's
 * records could overwrite a clock-in made before it returned.
 */
export async function openClock(page: Page) {
  // Explicit locale: without it the language follows the browser (en-US in Playwright)
  await page.goto('/fr/app/clock')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('button', { name: /ARRIVÉE/i })).toBeEnabled()
}
