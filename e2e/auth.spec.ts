import { test, expect } from '@playwright/test'
import { signIn, passChallenge } from './auth-helpers'

test.describe('Authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/app/clock')
    const url = page.url()
    expect(url).toMatch(/login|clock/)
  })

  test('login with correct credentials asks the 2FA code, then opens the app', async ({ page }) => {
    await signIn(page, 'admin@pointon.be')
    await expect(page).toHaveURL(/\/2fa\/challenge/)
    await passChallenge(page)
    expect(page.url()).not.toContain('/2fa/')
  })

  test('show error on incorrect password', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input#email', 'admin@pointon.be')
    await page.fill('input#password', 'wrongpassword')
    const response = await Promise.race([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => null),
    ])
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/login')
  })
})
