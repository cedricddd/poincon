import { isAdminRole } from '@/lib/roles'

// API side of the mandatory admin 2FA: an ADMIN / SUPER_ADMIN session that has not passed the
// 2FA code is refused on every API route (deny by default), except the routes needed to sign in
// and pass the code, and public / machine routes that never rely on the admin session.

const EXEMPT_PREFIXES = [
  '/api/auth/',          // sign-in, session, 2FA setup / challenge
  '/api/kiosk/',         // kiosk terminals (token)
  '/api/qr/',            // site QR codes (token)
  '/api/cron/',          // scheduled jobs (secret header)
  '/api/v1/',            // public API (API key)
  '/api/stripe/webhook', // Stripe signature
]

export function apiBlockedForUnverifiedAdmin(
  pathname: string,
  user: { role?: string | null; twoFactorVerified?: boolean } | null | undefined,
): boolean {
  if (!user || !isAdminRole(user.role) || user.twoFactorVerified) return false
  return !EXEMPT_PREFIXES.some(p => pathname.startsWith(p))
}
