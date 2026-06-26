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
            twoFactorEnabled: user.twoFactorEnabled,
            twoFactorTrustedUntil: user.twoFactorTrustedUntil,
          }
        } catch (error) {
          console.error('Auth error:', error)
          // Throw so NextAuth surfaces a non-CredentialsSignin error code,
          // letting the login page show "service unavailable" instead of
          // "wrong password" when the DB is still warming up after a deploy.
          throw new Error('ServiceUnavailable')
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
    async jwt({ token, user, trigger, session: updateData }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as { role: string; rememberMe: boolean }).role
        const rememberMe = (user as { rememberMe: boolean }).rememberMe
        const role = (user as { role: string }).role

        let sessionDurationMs: number
        if (!rememberMe) {
          sessionDurationMs = 8 * 60 * 60 * 1000
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          sessionDurationMs = 30 * 24 * 60 * 60 * 1000
        } else {
          sessionDurationMs = 90 * 24 * 60 * 60 * 1000
        }

        token.sessionExpiry = Date.now() + sessionDurationMs
        token.twoFactorEnabled = (user as { twoFactorEnabled?: boolean }).twoFactorEnabled ?? false
        const trustedUntil = (user as { twoFactorTrustedUntil?: Date | null }).twoFactorTrustedUntil
        token.twoFactorVerified = trustedUntil != null && new Date(trustedUntil) > new Date()
      }

      // Handle session.update({ twoFactorVerified, twoFactorEnabled }) from 2FA pages
      if (trigger === 'update' && updateData) {
        if (updateData.twoFactorVerified === true) token.twoFactorVerified = true
        if (typeof updateData.twoFactorEnabled === 'boolean') token.twoFactorEnabled = updateData.twoFactorEnabled
      }

      if (token.sessionExpiry && Date.now() > token.sessionExpiry) {
        return null
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role as string
        session.user.twoFactorEnabled = token.twoFactorEnabled ?? false
        session.user.twoFactorVerified = token.twoFactorVerified ?? false
      }
      return session
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
