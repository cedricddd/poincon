import { test, expect } from '@playwright/test'

test.describe('Offline Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/clock')
    await page.waitForURL('/app/clock')
  })

  test('shows pending badge when API fails', async ({ page }) => {
    await page.route('**/api/clock/record', route => route.abort('failed'))

    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    const pendingBadge = page.locator('text=/⏳|en attente/')
    await expect(pendingBadge).toBeVisible({ timeout: 5000 })
  })

  test('shows offline sync message on network timeout', async ({ page }) => {
    await page.route('**/api/clock/record', route => {
      setTimeout(() => route.abort('timedout'), 100)
    })

    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    await page.waitForTimeout(2000)
    await page.unroute('**/api/clock/record')
    const depButton = page.getByRole('button', { name: /DÉPART/i })
    await expect(depButton).toBeVisible({ timeout: 8000 })
  })

  test('retry sync after network recovery', async ({ page }) => {
    let requestCount = 0

    await page.route('**/api/clock/record', route => {
      requestCount++
      if (requestCount === 1) {
        route.abort('failed')
      } else {
        route.continue()
      }
    })

    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    await page.waitForTimeout(1000)

    await page.unroute('**/api/clock/record')

    const departButton = page.getByRole('button', { name: /DÉPART/i })
    await expect(departButton).toBeVisible({ timeout: 8000 })
  })

  test('IndexedDB stores pending actions', async ({ page }) => {
    await page.route('**/api/clock/record', route => route.abort('failed'))

    const clockInButton = page.getByRole('button', { name: /ARRIVÉE/i })
    await clockInButton.click()

    const pendingCount = await page.evaluate(() => {
      return new Promise((resolve) => {
        const request = indexedDB.open('PointonDB')
        request.onsuccess = () => {
          const db = request.result
          const txn = db.transaction(['pendingActions'])
          const store = txn.objectStore('pendingActions')
          const getRequest = store.getAll()
          getRequest.onsuccess = () => {
            resolve(getRequest.result.length)
          }
        }
      })
    })

    expect(pendingCount).toBeGreaterThan(0)
  })
})
