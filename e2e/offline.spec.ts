import { test, expect } from '@playwright/test'
import { createClockEmployee, resetClockDay, deleteClockCompanies, saveSession, openClock, type ClockEmployee } from './clock-fixture'

const PREFIX = 'e2e-offline-'
const SESSION = 'e2e/.auth/offline-employee.json'
let emp: ClockEmployee

// page.route() does not see requests made through the PWA service worker: once it controls
// the page, the "network down" routes below would be bypassed and the punch would reach the server.
test.use({ storageState: SESSION, serviceWorkers: 'block' })

/** Number of punches waiting in the browser's offline queue. */
const pendingActions = (page: import('@playwright/test').Page) =>
  page.evaluate(() => new Promise<number>(resolve => {
    const req = indexedDB.open('PointonDB')
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('pendingActions')) return resolve(0)
      const getAll = db.transaction(['pendingActions']).objectStore('pendingActions').getAll()
      getAll.onsuccess = () => resolve(getAll.result.length)
    }
    req.onerror = () => resolve(0)
  }))

test.describe.serial('Offline Behavior', () => {
  test.beforeAll(async ({ browser }) => {
    emp = createClockEmployee(PREFIX)
    await saveSession(browser, emp.email, SESSION)
  })

  test.afterAll(() => deleteClockCompanies(PREFIX))

  test.beforeEach(async ({ page }) => {
    resetClockDay(emp.userId)
    await openClock(page)
  })

  test('a failed clock-in is queued: pending badge and IndexedDB entry', async ({ page }) => {
    await page.route('**/api/clock/record', route => route.abort('failed'))
    await page.getByRole('button', { name: /ARRIVÉE/i }).click()

    await expect(page.getByText(/⏳ \d+ en attente/)).toBeVisible()
    await expect(page.getByRole('button', { name: /DÉPART/i })).toBeVisible()
    await expect.poll(() => pendingActions(page)).toBeGreaterThan(0)
  })

  test('a network timeout still records the arrival locally', async ({ page }) => {
    await page.route('**/api/clock/record', route => {
      setTimeout(() => route.abort('timedout'), 100)
    })
    await page.getByRole('button', { name: /ARRIVÉE/i }).click()
    await expect(page.getByRole('button', { name: /DÉPART/i })).toBeVisible({ timeout: 8000 })
  })

  test('retry sync after network recovery', async ({ page }) => {
    let requestCount = 0
    await page.route('**/api/clock/record', route => {
      requestCount++
      if (requestCount === 1) route.abort('failed')
      else route.continue()
    })
    await page.getByRole('button', { name: /ARRIVÉE/i }).click()
    await expect(page.getByRole('button', { name: /DÉPART/i })).toBeVisible({ timeout: 8000 })
  })
})
