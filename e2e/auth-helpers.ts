import type { Page } from '@playwright/test'
import { generateTOTP } from '../src/lib/totp'

/** Known TOTP secret given to E2E admins (base32), so tests can compute the 2FA code. */
export const E2E_TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
export const E2E_PASSWORD = 'password123'

// Pages are server-rendered: a click before React hydrates them does nothing (slow in dev),
// and the post-login redirects can interrupt the test's next navigation. Waiting for the
// network to settle covers both.
export async function signIn(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input#email', email)
  await page.fill('input#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
  await page.waitForLoadState('networkidle')
}

/** Admin sign-in: password, then the 2FA code (on a device not trusted yet). */
export async function signInAdmin(page: Page, email: string, secret = E2E_TOTP_SECRET, password = E2E_PASSWORD) {
  await signIn(page, email, password)
  if (page.url().includes('/2fa/challenge')) await passChallenge(page, secret)
}

export async function passChallenge(page: Page, secret = E2E_TOTP_SECRET) {
  await page.fill('input[autocomplete="one-time-code"]', generateTOTP(secret))
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.pathname.includes('/2fa/'))
  await page.waitForLoadState('networkidle')
}
