import crypto from 'crypto'

// "Trust this device for 30 days" after a successful 2FA code, bound to the browser through a
// signed httpOnly cookie (nothing stored in DB). The TOTP secret is part of the signature, so
// setting up a new device (new secret) invalidates every cookie issued before.

export const TRUST_COOKIE = 'pp_2fa_trust'
export const TRUST_DURATION_MS = 30 * 24 * 60 * 60 * 1000

function signingKey(): string {
  const key = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!key) throw new Error('AUTH_SECRET is not set')
  return key
}

const sign = (userId: string, expMs: number, twoFactorSecret: string) =>
  crypto.createHmac('sha256', signingKey()).update(`${userId}|${expMs}|${twoFactorSecret}`).digest('base64url')

export function createTrustToken(userId: string, twoFactorSecret: string, now = Date.now()): string {
  const expMs = now + TRUST_DURATION_MS
  return `${userId}.${expMs}.${sign(userId, expMs, twoFactorSecret)}`
}

export function isTrustTokenValid(
  token: string | null | undefined,
  userId: string,
  twoFactorSecret: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!token || !twoFactorSecret) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [tokenUser, expRaw, mac] = parts
  const expMs = Number(expRaw)
  if (tokenUser !== userId || !Number.isFinite(expMs) || expMs <= now) return false
  const expected = Buffer.from(sign(userId, expMs, twoFactorSecret))
  const given = Buffer.from(mac)
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}

/** Value of the trust cookie in a raw Cookie header. */
export function trustTokenFromCookieHeader(header: string | null | undefined): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === TRUST_COOKIE) return decodeURIComponent(rest.join('='))
  }
  return null
}

type CookieWriter = { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }

export function setTrustCookie(res: CookieWriter, userId: string, twoFactorSecret: string) {
  res.cookies.set(TRUST_COOKIE, createTrustToken(userId, twoFactorSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TRUST_DURATION_MS / 1000,
  })
}

export function clearTrustCookie(res: CookieWriter) {
  res.cookies.set(TRUST_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}
