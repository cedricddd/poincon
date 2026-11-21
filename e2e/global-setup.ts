import { test as setup } from '@playwright/test'
import { db } from './db'
import { signInAdmin, E2E_TOTP_SECRET } from './auth-helpers'

// The dev server compiles each route on its first request. When parallel specs hit the
// same cold route, the compile is slow (QR image past the 5 s assertion timeout) or the
// connection is dropped ("socket hang up"). Compile them here, one at a time.
// The status does not matter (404, 401, 405…): the request is only there to compile.
const WARM_UP = [
  '/fr/login', '/fr/app/clock', '/fr/2fa/challenge', '/fr/2fa/setup',
  '/fr/admin/dashboard/settings', '/fr/admin/dashboard/schedules',
  '/fr/kiosk/warmup', '/fr/qr/warmup', '/fr/qr/t/warmup',
  '/api/clock/record', '/api/clock/weekly', '/api/app/break',
  '/api/user/balance', '/api/user/sites', '/api/user/work-modes', '/api/user/leave-today',
  '/api/qr/warmup/clock', '/api/qr/t/warmup/clock', '/api/kiosk/warmup/qr', '/api/kiosk/warmup/info',
  '/api/admin/users', '/api/admin/schedule', '/api/admin/work-schedules',
  '/api/auth/2fa/setup', '/api/auth/2fa/challenge',
]

setup('warm up dev routes', async ({ request }) => {
  setup.setTimeout(5 * 60_000)
  for (const path of WARM_UP) await request.get(path, { timeout: 60_000, maxRedirects: 0 }).catch(() => {})
})

// The dev admin needs 2FA (mandatory for admins): give it the known E2E secret, then sign in
// through the 2FA code so the stored session is verified.
setup('login admin', async ({ page }) => {
  db(`await prisma.user.update({ where: { email: 'admin@pointon.be' }, data: { twoFactorEnabled: true, twoFactorSecret: ARGS.secret } })`, { secret: E2E_TOTP_SECRET })
  await signInAdmin(page, 'admin@pointon.be')
  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
