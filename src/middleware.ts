import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/set-password',
  '/2fa/',
  '/kiosk/',
  '/api/auth/',
  '/api/stripe/webhook',
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (pathname === '/') return NextResponse.next()

  // Not authenticated → login
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { role, twoFactorEnabled, twoFactorVerified } = session.user
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  // Admins must complete 2FA before accessing any protected route
  if (isAdmin && !twoFactorVerified) {
    if (twoFactorEnabled) {
      return NextResponse.redirect(new URL('/2fa/challenge', req.url))
    } else {
      return NextResponse.redirect(new URL('/2fa/setup', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg|.*\\.png|.*\\.ico|.*\\.webp).*)'],
}
