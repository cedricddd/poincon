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

  return NextResponse.next()
})

export const config = {
  matcher: ['/app/:path*', '/admin/:path*', '/super-admin/:path*', '/api/auth/signin', '/api/auth/callback/:path*', '/api/auth/signup'],
}
