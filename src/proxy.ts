import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const AUTH_ROUTES = ['/api/auth/signin', '/api/auth/callback', '/api/auth/signup']

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Forward pathname so server layouts can read it via headers()
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: ['/app/:path*', '/admin/:path*', '/super-admin/:path*', '/api/auth/signin', '/api/auth/callback/:path*', '/api/auth/signup'],
}
