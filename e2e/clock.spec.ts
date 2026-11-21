import { test, expect } from '@playwright/test'
import { db } from './db'
import { createClockEmployee, resetClockDay, deleteClockCompanies, saveSession, openClock, type ClockEmployee } from './clock-fixture'

const PREFIX = 'e2e-clock-'
const SESSION = 'e2e/.auth/clock-employee.json'
let emp: ClockEmployee

test.use({ storageState: SESSION })

test.describe.serial('Clock Punch (Online)', () => {
  test.beforeAll(async ({ browser }) => {
    emp = createClockEmployee(PREFIX)
    await saveSession(browser, emp.email, SESSION)
  })

  test.afterAll(() => deleteClockCompanies(PREFIX))

  test.beforeEach(async ({ page }) => {
    resetClockDay(emp.userId)
    await openClock(page)
  })

  test('clock in sends correct API request', async ({ page }) => {
    const responsePromise = page.waitForResponse(res =>
      res.url().includes('/api/clock/record') && res.request().method() === 'POST'
    )
    await page.getByRole('button', { name: /ARRIVÉE/i }).click()
    expect((await responsePromise).status()).toBe(201)
  })

  test('button changes to DEPART and the timer runs after clock in', async ({ page }) => {
    await page.getByRole('button', { name: /ARRIVÉE/i }).click()
    await expect(page.getByRole('button', { name: /DÉPART/i })).toBeVisible()
    await expect(page.getByText('En cours').first()).toBeVisible()
  })

  test('clock out sends the record id and the departure time', async ({ page }) => {
    await page.getByRole('button', { name: /ARRIVÉE/i }).click()
    const clockOut = page.getByRole('button', { name: /DÉPART/i })
    await expect(clockOut).toBeEnabled()
    // The screen clock ticks once a second: a departure in the same second as the arrival
    // is refused by the server (departure must be after arrival). Wait for the timer to move.
    await expect(page.getByText(/^00:00:0[1-9]$/)).toBeVisible()

    const patch = page.waitForRequest(req => req.url().includes('/api/clock/record') && req.method() === 'PATCH')
    await clockOut.click()
    const payload = (await patch).postDataJSON()
    expect(payload).toHaveProperty('recordId')
    expect(payload).toHaveProperty('departureTime')

    // Back to the arrival button once the session is closed
    await expect(page.getByRole('button', { name: /ARRIVÉE/i })).toBeVisible()
  })

  test('audit log created after clock in', async ({ page }) => {
    const count = () => db<number>(`return prisma.auditLog.count({ where: { userId: ARGS.userId, action: 'clock_in' } })`, { userId: emp.userId })
    const before = count()
    const posted = page.waitForResponse(res => res.url().includes('/api/clock/record') && res.request().method() === 'POST')
    await page.getByRole('button', { name: /ARRIVÉE/i }).click()
    expect((await posted).status()).toBe(201)
    expect(count()).toBe(before + 1)
  })
})
