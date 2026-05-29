import { test as setup } from '@playwright/test'

setup('login admin', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input#email', 'admin@pointon.be')
  await page.fill('input#password', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/app/clock')
  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
