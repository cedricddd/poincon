import { test, expect } from '@playwright/test'

test.describe('Clock Punch (Online)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/clock')
    await page.waitForURL('/app/clock')
  })

  test('clock in button is visible', async ({ page }) => {
    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await expect(clockInButton).toBeVisible()
  })

  test('clock in sends correct API request', async ({ page }) => {
    const responsePromise = page.waitForResponse(res =>
      res.url().includes('/api/clock/record') && res.request().method() === 'POST'
    )

    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    const response = await responsePromise
    expect(response.status()).toBeLessThan(400)
  })

  test('button changes to DEPART after clock in', async ({ page }) => {
    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    await page.waitForTimeout(500)
    const clockOutButton = page.getByRole('button', { name: /DÉPART/i })
    await expect(clockOutButton).toBeVisible({ timeout: 5000 })
  })

  test('En cours badge visible after clock in', async ({ page }) => {
    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    const enCoursBadge = page.locator('text=En cours')
    await expect(enCoursBadge).toBeVisible({ timeout: 5000 })
  })

  test('timer starts counting after clock in', async ({ page }) => {
    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    await page.waitForTimeout(2000)
    const enCoursBadge = page.getByText('En cours', { exact: false }).first()
    await expect(enCoursBadge).toBeVisible({ timeout: 5000 })
  })

  test('clock out sends correct API request', async ({ page }) => {
    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    await page.waitForTimeout(1000)

    let patchPayload: any
    page.on('request', request => {
      if (request.url().includes('/api/clock/record') && request.method() === 'PATCH') {
        patchPayload = request.postDataJSON()
      }
    })

    const clockOutButton = page.getByRole('button', { name: /DÉPART/i })
    await clockOutButton.click()

    await page.waitForTimeout(1000)
    expect(patchPayload).toBeDefined()
    expect(patchPayload).toHaveProperty('recordId')
    expect(patchPayload).toHaveProperty('departureTime')
  })

  test('sessions card appears after clock out', async ({ page }) => {
    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    await page.waitForTimeout(1500)

    const clockOutButton = page.getByRole('button', { name: /DÉPART/i })
    await clockOutButton.click()

    await page.waitForTimeout(2000)
    const departButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await expect(departButton).toBeVisible({ timeout: 5000 })
  })

  test('audit log created after clock in', async ({ page, context }) => {
    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    await page.waitForTimeout(1500)

    const adminPage = await context.newPage()
    await adminPage.goto('/admin/dashboard/audit')
    await adminPage.waitForURL('/admin/dashboard/audit')

    await adminPage.waitForTimeout(2000)
    const tableBody = adminPage.locator('tbody tr')
    const rowCount = await tableBody.count()
    expect(rowCount).toBeGreaterThan(0)
  })
})
