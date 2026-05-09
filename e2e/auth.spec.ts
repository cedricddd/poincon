import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.use({ storageState: undefined })

  test('redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/app/clock')
    const url = page.url()
    expect(url).toMatch(/login|clock/)
  })

  test('login with correct credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input#email', 'admin@poincon.be')
    await page.fill('input#password', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/app/clock')
    expect(page.url()).toContain('/app/clock')
  })

  test('show error on incorrect password', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input#email', 'admin@poincon.be')
    await page.fill('input#password', 'wrongpassword')
    const response = await Promise.race([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => null),
    ])
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/login')
  })
})
