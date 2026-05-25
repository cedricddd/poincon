import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'vous@entreprise.be' },
        password: { label: 'Mot de passe', type: 'password' },
        rememberMe: { label: 'Se souvenir de moi', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        try {
          const user = await prisma.user.findUnique({ where: { email } })
          if (!user || !user.password) return null

          const isValid = await bcrypt.compare(password, user.password)
          if (!isValid) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            rememberMe: credentials?.rememberMe === 'true',
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 90 * 24 * 60 * 60, // 90 days max (shorter for non-rememberMe users via sessionExpiry check)
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as { role: string; rememberMe: boolean }).role
        const rememberMe = (user as { rememberMe: boolean }).rememberMe
        const role = (user as { role: string }).role

        let sessionDurationMs: number
        if (!rememberMe) {
          sessionDurationMs = 8 * 60 * 60 * 1000 // 8h without remember me
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          sessionDurationMs = 30 * 24 * 60 * 60 * 1000 // 30 days
        } else {
          sessionDurationMs = 90 * 24 * 60 * 60 * 1000 // 90 days for EMPLOYEE/MANAGER
        }

        token.sessionExpiry = Date.now() + sessionDurationMs
      }

      // Invalidate session if custom expiry exceeded
      if (token.sessionExpiry && Date.now() > token.sessionExpiry) {
        return null
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role as string
      }
      return session
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
