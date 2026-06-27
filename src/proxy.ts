import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

const AUTH_ROUTES = ['/api/auth/signin', '/api/auth/callback', '/api/auth/signup']
const TWO_FA_API_PATHS = ['/api/auth/2fa/']
const TWO_FA_UI_PATHS = ['/2fa/setup', '/2fa/challenge']
const PROTECTED_PATHS = ['/app', '/admin', '/super-admin']
const LOCALES = routing.locales as readonly string[]

const handleI18nRouting = createMiddleware(routing)

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

  // API routes: skip i18n routing entirely
  if (pathname.startsWith('/api/')) {
    if (AUTH_ROUTES.some(r => pathname.startsWith(r))) return withHeaders()
    if (TWO_FA_API_PATHS.some(p => pathname.startsWith(p))) return withHeaders()
    return withHeaders()
  }

  // Extract locale from URL (e.g. /fr/admin → 'fr'; /admin → use default 'fr')
  const localeRegex = new RegExp(`^/(${LOCALES.join('|')})(\/|$)`)
  const localeMatch = pathname.match(localeRegex)
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale
  const pathWithoutLocale = localeMatch
    ? pathname.slice(locale.length + 1) || '/'
    : pathname

  // next-intl reads the active locale from this request header (server components,
  // getMessages/getTranslations). Our pass-through response below replaces next-intl's
  // own response, so we must set it ourselves or messages fall back to defaultLocale.
  requestHeaders.set('x-next-intl-locale', locale)

  // 2FA UI pages: allow through without full auth enforcement
  if (TWO_FA_UI_PATHS.some(p => pathWithoutLocale.startsWith(p))) {
    return withHeaders()
  }

  // Auth check for protected paths
  const isProtected = PROTECTED_PATHS.some(p => pathWithoutLocale.startsWith(p))

  if (!req.auth && isProtected) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
  }

  if (req.auth) {
    const { role, twoFactorEnabled, twoFactorVerified } = req.auth.user as {
      role: string
      twoFactorEnabled?: boolean
      twoFactorVerified?: boolean
    }
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

    if (isProtected && isAdmin && !twoFactorVerified) {
      return NextResponse.redirect(
        new URL(
          twoFactorEnabled ? `/${locale}/2fa/challenge` : `/${locale}/2fa/setup`,
          req.url
        )
      )
    }
  }

  // Let next-intl handle locale prefix routing (/ → /fr/, /nl/login stays, etc.)
  const i18nRes = handleI18nRouting(req)

  // If it's a locale redirect (e.g. / → /fr/), add security headers and return
  if (i18nRes.status >= 300 && i18nRes.status < 400) {
    i18nRes.headers.set('Content-Security-Policy', csp)
    return i18nRes
  }

  // Pass-through: use our response so x-nonce and x-pathname are available in layouts
  return withHeaders()
})

export const config = {
  matcher: [
    // Skip all static files (any path with a dot) and _next internals
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
