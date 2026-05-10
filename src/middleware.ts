import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rateLimit } from '@/lib/rateLimit'

const AUTH_ROUTES = ['/api/auth/signin', '/api/auth/callback', '/api/auth/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les routes d'auth sans vérification
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    // Rate limiting sur les routes d'authentification : 10 tentatives / 5 minutes par IP
    if (request.method === 'POST') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? request.ip
        ?? 'unknown'
      const { allowed, remaining } = rateLimit(`auth:${ip}`, 10, 5 * 60 * 1000)
      if (!allowed) {
        return NextResponse.json(
          { error: 'Trop de tentatives. Réessayez dans 5 minutes.' },
          { status: 429, headers: { 'Retry-After': '300' } }
        )
      }
      const res = NextResponse.next()
      res.headers.set('X-RateLimit-Remaining', String(remaining))
      return res
    }
    return NextResponse.next()
  }

  // Protection des routes app/* et admin/*
  const token = await getToken({ req: request })
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/admin/:path*', '/super-admin/:path*', '/api/auth/signin', '/api/auth/callback/:path*', '/api/auth/signup'],
}
