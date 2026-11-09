import { test as setup } from '@playwright/test'
import { db } from './db'
import { signInAdmin, E2E_TOTP_SECRET } from './auth-helpers'

// The dev admin needs 2FA (mandatory for admins): give it the known E2E secret, then sign in
// through the 2FA code so the stored session is verified.
setup('login admin', async ({ page }) => {
  db(`await prisma.user.update({ where: { email: 'admin@pointon.be' }, data: { twoFactorEnabled: true, twoFactorSecret: ARGS.secret } })`, { secret: E2E_TOTP_SECRET })
  await signInAdmin(page, 'admin@pointon.be')
  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
