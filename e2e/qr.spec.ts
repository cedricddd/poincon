import { test, expect, type Browser, type Page } from '@playwright/test'
import { execFileSync } from 'child_process'
import { randomBytes } from 'crypto'

/**
 * Runs a Prisma snippet inside the dev app container and returns its JSON result.
 * The host port 5433 can be shadowed by a native Postgres, so the DB is only
 * reached from inside Docker. `prisma` and `bcrypt` are in scope; `ARGS` holds the input.
 */
function db<T = unknown>(body: string, args: unknown = {}): T {
  const script = `
    const { PrismaClient } = require('@prisma/client')
    const bcrypt = require('bcryptjs')
    const prisma = new PrismaClient()
    const ARGS = ${JSON.stringify(args)}
    ;(async () => { ${body} })()
      .then(r => { process.stdout.write(JSON.stringify(r ?? null)) })
      .catch(e => { console.error(e); process.exitCode = 1 })
      .finally(() => prisma.$disconnect())
  `
  const out = execFileSync('docker', ['exec', '-i', 'pointon-app-dev', 'node', '-'], { input: script, encoding: 'utf8' })
  return JSON.parse(out) as T
}

const suffix = randomBytes(4).toString('hex')
const PASSWORD = 'password123'

type Fixture = { companyId: string; token: string; userIds: string[] }
let qrCo: Fixture
let otherCo: Fixture
let employeeEmail: string
let otherAdminEmail: string

// Self-contained: every test builds its own session, no dependency on the global admin login
test.use({ storageState: { cookies: [], origins: [] } })

function createCompany(label: string, members: { email: string; role: string; pin?: string }[]): Fixture {
  return db<Fixture>(`
    const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'BUSINESS' } })
    const password = await bcrypt.hash(ARGS.password, 10)
    const users = []
    for (const m of ARGS.members) {
      users.push(await prisma.user.create({ data: {
        email: m.email, name: ARGS.label + ' ' + m.role, password, role: m.role,
        kioskPin: m.pin ? await bcrypt.hash(m.pin, 4) : null,
      } }))
    }
    const company = await prisma.company.create({ data: { name: ARGS.companyName, address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: users[0].id, planId: plan.id } })
    await prisma.user.updateMany({ where: { id: { in: users.map(u => u.id) } }, data: { companyId: company.id } })
    await prisma.site.create({ data: { name: 'Site ' + ARGS.label, companyId: company.id, qrToken: ARGS.token } })
    return { companyId: company.id, token: ARGS.token, userIds: users.map(u => u.id) }
  `, { label, members, password: PASSWORD, companyName: `E2E ${label} ${suffix}`, token: randomBytes(24).toString('hex') })
}

async function anonymousPage(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  return context.newPage()
}

async function signIn(page: Page, email: string, callbackUrl?: string) {
  await page.goto(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login')
  await page.fill('input#email', email)
  await page.fill('input#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
}

test.describe.serial('QR clocking — company lock and account mode', () => {
  test.beforeAll(() => {
    employeeEmail = `e2e-qr-emp-${suffix}@example.test`
    otherAdminEmail = `e2e-qr-other-${suffix}@example.test`
    qrCo = createCompany('QR', [
      { email: `e2e-qr-admin-${suffix}@example.test`, role: 'ADMIN' },
      { email: employeeEmail, role: 'EMPLOYEE', pin: '4821' },
      { email: `e2e-qr-dup1-${suffix}@example.test`, role: 'EMPLOYEE', pin: '7000' },
      { email: `e2e-qr-dup2-${suffix}@example.test`, role: 'EMPLOYEE', pin: '7000' },
    ])
    otherCo = createCompany('Other', [{ email: otherAdminEmail, role: 'ADMIN' }])
  })

  // Removes every QR test user (this run and any interrupted one) and their companies
  test.afterAll(() => {
    db(`
      const users = await prisma.user.findMany({
        where: { email: { startsWith: 'e2e-qr-', endsWith: '@example.test' } },
        select: { id: true, companyId: true },
      })
      const userIds = users.map(u => u.id)
      const companyIds = [...new Set(users.map(u => u.companyId).filter(Boolean))]
      await prisma.breakEntry.deleteMany({ where: { clockRecord: { userId: { in: userIds } } } })
      await prisma.clockRecord.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { companyId: null } })
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    `)
  })

  test('a device signed in to another company is blocked', async ({ page }) => {
    await signIn(page, otherAdminEmail)
    await page.goto(`/qr/${qrCo.token}`)
    await expect(page.getByRole('heading', { name: 'Autre société' })).toBeVisible()

    const res = await page.request.post(`/api/qr/${qrCo.token}/clock`, { data: { pin: '4821' } })
    expect(res.status()).toBe(403)
    expect((await res.json()).code).toBe('OTHER_COMPANY')
  })

  test('anonymous PIN flow is unchanged by default', async ({ browser }) => {
    const page = await anonymousPage(browser)
    await page.goto(`/qr/${qrCo.token}`)
    await expect(page.getByText('Entrez votre code PIN')).toBeVisible()
    for (const d of '4821') await page.getByRole('button', { name: d, exact: true }).click()
    await expect(page.getByText('Bienvenue au travail,')).toBeVisible()
    await page.context().close()
  })

  test('a PIN shared by two employees is rejected instead of clocking at random', async ({ browser }) => {
    const page = await anonymousPage(browser)
    const res = await page.request.post(`/api/qr/${qrCo.token}/clock`, { data: { pin: '7000' } })
    expect(res.status()).toBe(409)
    expect((await res.json()).code).toBe('PIN_AMBIGUOUS')
    await page.context().close()
  })

  test('account-only mode requires login, then clocks the session user without PIN', async ({ browser }) => {
    db(`await prisma.company.update({ where: { id: ARGS.id }, data: { qrAccountOnly: true } })`, { id: qrCo.companyId })
    const page = await anonymousPage(browser)
    const qrPath = `/qr/${qrCo.token}`

    await page.goto(qrPath)
    await expect(page.getByRole('heading', { name: 'Connexion requise' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Se connecter' }))
      .toHaveAttribute('href', `/login?callbackUrl=${encodeURIComponent(qrPath)}`)

    await signIn(page, employeeEmail, qrPath)
    expect(new URL(page.url()).pathname).toMatch(new RegExp(`^(/[a-z]{2})?${qrPath}$`))

    await expect(page.getByText('Entrez votre code PIN')).toHaveCount(0)
    await page.getByRole('button', { name: 'Pointer' }).click()
    // Employee already clocked in by the PIN test → this one is a departure
    await expect(page.getByText('Au revoir,')).toBeVisible()
    await page.context().close()
  })
})
