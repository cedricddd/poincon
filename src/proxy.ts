import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const AUTH_ROUTES = ['/api/auth/signin', '/api/auth/callback', '/api/auth/signup']
const TWO_FA_PATHS = ['/2fa/setup', '/2fa/challenge', '/api/auth/2fa/']

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // 2FA pages must be accessible with a partial (unverified) session
  if (TWO_FA_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Admins must complete 2FA before accessing any protected route
  const { role, twoFactorEnabled, twoFactorVerified } = req.auth.user as {
    role: string
    twoFactorEnabled?: boolean
    twoFactorVerified?: boolean
  }
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  if (isAdmin && !twoFactorVerified) {
    if (twoFactorEnabled) {
      return NextResponse.redirect(new URL('/2fa/challenge', req.url))
    } else {
      return NextResponse.redirect(new URL('/2fa/setup', req.url))
    }
  }

  // Forward pathname so server layouts can read it via headers()
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: ['/app/:path*', '/admin/:path*', '/super-admin/:path*', '/api/auth/signin', '/api/auth/callback/:path*', '/api/auth/signup'],
}
