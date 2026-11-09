import { test, expect, type Browser } from '@playwright/test'
import { randomBytes } from 'crypto'
import { db } from './db'
import { signIn, passChallenge, E2E_TOTP_SECRET, E2E_PASSWORD } from './auth-helpers'
import { generateTOTP } from '../src/lib/totp'

// Admin 2FA is mandatory: no admin API before the code, trust is per device (browser),
// the secret cannot be replaced with a password alone, and a disabled 2FA is never a way in.

const suffix = randomBytes(4).toString('hex')
const EMAIL_PREFIX = 'e2e-2fa-'
const adminEmail = `${EMAIL_PREFIX}admin-${suffix}@example.test`
const legacyEmail = `${EMAIL_PREFIX}legacy-${suffix}@example.test`

const freshPage = async (browser: Browser) =>
  (await browser.newContext({ storageState: { cookies: [], origins: [] } })).newPage()

test.use({ storageState: { cookies: [], origins: [] } })

test.describe.serial('Admin 2FA', () => {
  test.beforeAll(() => {
    db(`
      const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'BUSINESS' } })
      const password = await bcrypt.hash(ARGS.password, 10)
      const admin = await prisma.user.create({ data: { email: ARGS.adminEmail, name: 'Admin 2FA', password, role: 'ADMIN', twoFactorEnabled: true, twoFactorSecret: ARGS.secret } })
      // Danielle's case: 2FA turned off, old account-wide trust date still in the future
      const legacy = await prisma.user.create({ data: { email: ARGS.legacyEmail, name: 'Admin legacy', password, role: 'ADMIN', twoFactorEnabled: false, twoFactorTrustedUntil: new Date(Date.now() + 20 * 86400000) } })
      const company = await prisma.company.create({ data: { name: 'E2E 2FA', address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: admin.id, planId: plan.id, onboardingCompleted: true } })
      const legacyCo = await prisma.company.create({ data: { name: 'E2E 2FA legacy', address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: legacy.id, planId: plan.id, onboardingCompleted: true } })
      await prisma.user.update({ where: { id: admin.id }, data: { companyId: company.id } })
      await prisma.user.update({ where: { id: legacy.id }, data: { companyId: legacyCo.id } })
    `, { adminEmail, legacyEmail, password: E2E_PASSWORD, secret: E2E_TOTP_SECRET })
  })

  test.afterAll(() => {
    db(`
      const users = await prisma.user.findMany({ where: { email: { startsWith: ARGS.prefix, endsWith: '@example.test' } }, select: { id: true, companyId: true } })
      const userIds = users.map(u => u.id)
      const companyIds = [...new Set(users.map(u => u.companyId).filter(Boolean))]
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { companyId: null } })
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    `, { prefix: EMAIL_PREFIX })
  })

  test('no admin API before the code, and the secret cannot be replaced', async ({ page }) => {
    await signIn(page, adminEmail)
    await expect(page).toHaveURL(/\/2fa\/challenge/)
    expect((await page.request.get('/api/admin/users')).status()).toBe(403)
    expect((await page.request.get('/api/user/balance')).status()).toBe(403)

    // A password alone must not register a new authenticator
    const attackerSecret = 'KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU'
    expect((await page.request.get('/api/auth/2fa/setup')).status()).toBe(409)
    const overwrite = await page.request.post('/api/auth/2fa/setup', { data: { secret: attackerSecret, code: generateTOTP(attackerSecret) } })
    expect(overwrite.status()).toBe(409)

    await passChallenge(page)
    expect((await page.request.get('/api/admin/users')).status()).toBe(200)
  })

  test('trust is per device: a new browser is asked the code, the trusted one is not', async ({ page, browser }) => {
    // Device A passes the code once
    await signIn(page, adminEmail)
    await passChallenge(page)
    await page.context().clearCookies({ name: 'authjs.session-token' })
    await signIn(page, adminEmail)
    await expect(page).not.toHaveURL(/\/2fa\//)

    // Device B (no cookie) with the same password is asked the code
    const other = await freshPage(browser)
    await signIn(other, adminEmail)
    await expect(other).toHaveURL(/\/2fa\/challenge/)
    expect((await other.request.get('/api/admin/users')).status()).toBe(403)
    await other.context().close()
  })

  test('a disabled 2FA with an old trust date is not a way in (Danielle case)', async ({ page }) => {
    await signIn(page, legacyEmail)
    await expect(page).toHaveURL(/\/2fa\/setup/)
    expect((await page.request.get('/api/admin/users')).status()).toBe(403)
  })

  test('"change device" sends the admin straight to the setup of the new device', async ({ page }) => {
    await signIn(page, adminEmail)
    if (page.url().includes('/2fa/challenge')) await passChallenge(page)
    await page.goto('/fr/admin/dashboard/settings')
    await page.getByRole('button', { name: 'Refuser' }).click({ timeout: 5000 }).catch(() => {}) // cookie banner
    await page.fill('input[placeholder="123 456"]', generateTOTP(E2E_TOTP_SECRET))
    await page.getByRole('button', { name: "Changer d'appareil" }).click()
    await page.waitForURL(/\/2fa\/setup/)
    expect((await page.request.get('/api/admin/users')).status()).toBe(403)
    await page.screenshot({ path: 'test-results/2fa-change-device.png', fullPage: true })
  })
})
