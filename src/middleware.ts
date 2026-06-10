import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((req: NextRequest & { auth: { user?: { id?: string; role?: string; twoFactorEnabled?: boolean; twoFactorVerified?: boolean } } | null }) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public paths — always allow
  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/set-password') ||
    pathname.startsWith('/2fa') ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/api/stripe/webhook') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/kiosk') ||
    pathname === '/' ||
    pathname === '/offline' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'

  if (isPublic) return NextResponse.next()

  // Must be authenticated for any protected route
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = session.user.role ?? ''
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const twoFactorEnabled = session.user.twoFactorEnabled ?? false
  const twoFactorVerified = session.user.twoFactorVerified ?? false

  // 2FA challenge: authenticated but not yet verified this session
  if (twoFactorEnabled && !twoFactorVerified && !pathname.startsWith('/2fa')) {
    return NextResponse.redirect(new URL('/2fa/challenge', req.url))
  }

  // 2FA enforcement for admins: must set up 2FA if not enabled
  if (isAdmin && !twoFactorEnabled && pathname.startsWith('/admin') && !pathname.startsWith('/admin/dashboard/settings')) {
    return NextResponse.redirect(new URL('/2fa/setup', req.url))
  }

  // Route protection by role
  if (pathname.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/app/clock', req.url))
  }
  if (pathname.startsWith('/manager') && role !== 'MANAGER' && !isAdmin) {
    return NextResponse.redirect(new URL('/app/clock', req.url))
  }
  if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|icons/|manifest.json).*)',
  ],
}
