// Shared Sentry configuration used by the server, edge and client inits.
// Keeps the three `Sentry.init` call sites in sync and centralises noise filtering.
import type { ErrorEvent } from '@sentry/nextjs'

// Sentry only reports from production. Local dev and CI never reach the dashboard
// or Slack — this kills the browser-extension hydration mismatches that fire on
// localhost (pCloud Pass, LastPass, 1Password… inject DOM before React hydrates).
// Escape hatch: set SENTRY_FORCE_ENABLE=1 (or NEXT_PUBLIC_SENTRY_FORCE_ENABLE=1
// for the browser) to test Sentry wiring from a dev machine.
export const SENTRY_ENABLED =
  process.env.NODE_ENV === 'production' ||
  process.env.SENTRY_FORCE_ENABLE === '1' ||
  process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE === '1'

export const SENTRY_TRACES_SAMPLE_RATE = process.env.NODE_ENV === 'production' ? 0.1 : 1.0

// Substrings left in the DOM / stack by password-manager & other browser
// extensions that rewrite the page before React hydrates.
const EXTENSION_MARKERS = [
  'pcloud-pass',
  'data-pcloud',
  'data-lastpass',
  'data-lpignore',
  'data-1p-',
  'data-1password',
  'data-bwignore',
  'data-dashlane',
  'data-bitwarden',
  'chrome-extension://',
  'moz-extension://',
  'safari-web-extension://',
]

function isHydrationError(event: ErrorEvent): boolean {
  const values = event.exception?.values ?? []
  const text = `${event.message ?? ''} ${values.map(v => `${v.type ?? ''} ${v.value ?? ''}`).join(' ')}`
  return /hydrat|server rendered HTML|did(n't| not) match/i.test(text)
}

function looksLikeExtensionTampering(event: ErrorEvent): boolean {
  let haystack = ''
  try {
    haystack = JSON.stringify(event).toLowerCase()
  } catch {
    haystack = (event.message ?? '').toLowerCase()
  }
  return EXTENSION_MARKERS.some(marker => haystack.includes(marker))
}

// Unauthenticated credential pages. Password managers reliably rewrite the
// email/password DOM before React hydrates, and React's generic hydration error
// ("this tree will be regenerated on the client") carries no attribute diff we
// can attribute back to them — so on these routes a hydration mismatch is never
// actionable on our side. Real hydration bugs elsewhere still get through.
const CREDENTIAL_PATH_RE = /\/(login|signup|forgot-password|reset-password|set-password)(\/|$|\?)/

function isCredentialPage(event: ErrorEvent): boolean {
  return (
    CREDENTIAL_PATH_RE.test(event.request?.url ?? '') ||
    CREDENTIAL_PATH_RE.test(event.transaction ?? '')
  )
}

function stripSensitiveHeaders(event: ErrorEvent): void {
  if (!event.request?.headers) return
  const safe = { ...event.request.headers }
  delete safe['authorization']
  delete safe['cookie']
  delete safe['x-cron-secret']
  event.request.headers = safe
}

/** Shared `beforeSend`: scrubs secrets, then drops hydration mismatches that are
 *  attributable to a visitor's browser extension or that fire on an unauthenticated
 *  credential page (password-manager tampering — not actionable on our side). */
export function beforeSendError(event: ErrorEvent): ErrorEvent | null {
  stripSensitiveHeaders(event)
  if (isHydrationError(event) && (looksLikeExtensionTampering(event) || isCredentialPage(event))) {
    return null
  }
  return event
}
