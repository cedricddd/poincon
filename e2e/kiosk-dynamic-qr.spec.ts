import { test, expect, type Browser } from '@playwright/test'
import { createHmac, randomBytes } from 'crypto'
import { db } from './db'

// Dynamic QR shown on a kiosk terminal: the code changes every 30 s, a photo expires,
// the printed site QR is retired while the terminal shows it.

const suffix = randomBytes(4).toString('hex')
const PASSWORD = 'password123'
const PUBLIC_ID = `e2edyn${suffix}`
const SECRET = randomBytes(32).toString('base64url')

type Fixture = { companyId: string; siteToken: string; terminalToken: string }
let co: Fixture

test.use({ storageState: { cookies: [], origins: [] } })

const code = (offsetSteps = 0) =>
  createHmac('sha256', SECRET)
    .update(`${PUBLIC_ID}:${Math.floor(Date.now() / 30000) + offsetSteps}`)
    .digest('base64url')
    .slice(0, 12)

async function anonymousPage(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  return context.newPage()
}

test.describe.serial('Kiosk dynamic QR', () => {
  test.beforeAll(() => {
    co = db<Fixture>(`
      const plan = await prisma.plan.findUniqueOrThrow({ where: { name: 'STARTER' } })
      const password = await bcrypt.hash(ARGS.password, 10)
      const admin = await prisma.user.create({ data: { email: ARGS.admin, name: 'E2E dyn admin', password, role: 'ADMIN' } })
      const emp = await prisma.user.create({ data: { email: ARGS.emp, name: 'E2E dyn emp', password, role: 'EMPLOYEE', kioskPin: await bcrypt.hash('5831', 4) } })
      const company = await prisma.company.create({ data: { name: ARGS.name, address: 'E2E', phone: '000', vatNumber: 'BE0000000000', adminId: admin.id, planId: plan.id } })
      await prisma.user.updateMany({ where: { id: { in: [admin.id, emp.id] } }, data: { companyId: company.id } })
      const site = await prisma.site.create({ data: { name: 'Site dyn', companyId: company.id, qrToken: ARGS.siteToken } })
      await prisma.kioskToken.create({ data: {
        token: ARGS.terminalToken, companyId: company.id, siteId: site.id,
        displayMode: 'qr_pin', qrPublicId: ARGS.publicId, qrSecret: ARGS.secret, qrIntervalSeconds: 30,
      } })
      return { companyId: company.id, siteToken: ARGS.siteToken, terminalToken: ARGS.terminalToken }
    `, {
      password: PASSWORD,
      admin: `e2e-dyn-admin-${suffix}@example.test`,
      emp: `e2e-dyn-emp-${suffix}@example.test`,
      name: `E2E dyn ${suffix}`,
      siteToken: randomBytes(24).toString('hex'),
      terminalToken: randomBytes(24).toString('base64url'),
      publicId: PUBLIC_ID,
      secret: SECRET,
    })
  })

  test.afterAll(() => {
    db(`
      const users = await prisma.user.findMany({
        where: { email: { startsWith: 'e2e-dyn-', endsWith: '@example.test' } },
        select: { id: true, companyId: true },
      })
      const userIds = users.map(u => u.id)
      const companyIds = [...new Set(users.map(u => u.companyId).filter(Boolean))]
      await prisma.clockRecord.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { companyId: null } })
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    `)
  })

  test('the tablet shows the rotating QR and the backup PIN button', async ({ browser }) => {
    const page = await anonymousPage(browser)
    await page.goto(`/kiosk/${co.terminalToken}`)
    await expect(page.getByAltText('QR code de pointage')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pas de téléphone ? Code PIN' })).toBeVisible()
    await page.context().close()
  })

  test('a current code opens the PIN screen and clocks in', async ({ browser }) => {
    const page = await anonymousPage(browser)
    await page.goto(`/qr/t/${PUBLIC_ID}?c=${code()}`)
    await expect(page.getByText('Entrez votre code PIN')).toBeVisible()
    for (const d of '5831') await page.getByRole('button', { name: d, exact: true }).click()
    await expect(page.getByText('Bienvenue au travail,')).toBeVisible()
    await page.context().close()
  })

  test('a code two intervals old is expired, on the page and on the API', async ({ browser }) => {
    const page = await anonymousPage(browser)
    await page.goto(`/qr/t/${PUBLIC_ID}?c=${code(-2)}`)
    await expect(page.getByRole('heading', { name: 'QR code expiré' })).toBeVisible()
    const res = await page.request.post(`/api/qr/t/${PUBLIC_ID}/clock`, { data: { code: code(-2), pin: '5831' } })
    expect(res.status()).toBe(410)
    expect((await res.json()).code).toBe('QR_EXPIRED')
    await page.context().close()
  })

  test('the printed site QR is retired while the terminal shows the dynamic QR', async ({ browser }) => {
    const page = await anonymousPage(browser)
    await page.goto(`/qr/${co.siteToken}`)
    await expect(page.getByRole('heading', { name: 'QR code remplacé' })).toBeVisible()
    const res = await page.request.post(`/api/qr/${co.siteToken}/clock`, { data: { pin: '5831' } })
    expect(res.status()).toBe(403)
    expect((await res.json()).code).toBe('QR_DYNAMIC_ONLY')
    await page.context().close()
  })
})
