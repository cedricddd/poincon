import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const AUTH_ROUTES = ['/api/auth/signin', '/api/auth/callback', '/api/auth/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer toutes les routes d'auth sans vérification ni rate limiting
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
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
