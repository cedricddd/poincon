import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const AUTH_ROUTES = ['/api/auth/signin', '/api/auth/callback', '/api/auth/signup']
const TWO_FA_PATHS = ['/2fa/setup', '/2fa/challenge', '/api/auth/2fa/']
const PROTECTED_PATHS = ['/app', '/admin', '/super-admin']

function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production'
  return [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
    "frame-ancestors 'self'",
  ].join('; ')
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCSP(nonce)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)
  requestHeaders.set('x-nonce', nonce)

  const withHeaders = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Content-Security-Policy', csp)
    return res
  }

  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) return withHeaders()
  if (TWO_FA_PATHS.some(p => pathname.startsWith(p))) return withHeaders()

  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))

  if (!req.auth) {
    if (isProtected) return NextResponse.redirect(new URL('/login', req.url))
    return withHeaders()
  }

  const { role, twoFactorEnabled, twoFactorVerified } = req.auth.user as {
    role: string
    twoFactorEnabled?: boolean
    twoFactorVerified?: boolean
  }
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  if (isProtected && isAdmin && !twoFactorVerified) {
    if (twoFactorEnabled) {
      return NextResponse.redirect(new URL('/2fa/challenge', req.url))
    } else {
      return NextResponse.redirect(new URL('/2fa/setup', req.url))
    }
  }

  return withHeaders()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
}
