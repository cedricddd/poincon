import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'vous@entreprise.be' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Missing credentials')
          return null
        }

        try {
          console.log('[AUTH] Looking up user:', credentials.email)
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user || !user.password) {
            console.log('[AUTH] User not found or no password:', { found: !!user, hasPassword: !!user?.password })
            return null
          }

          console.log('[AUTH] User found, comparing password...')
          const isValid = await bcrypt.compare(credentials.password, user.password)
          console.log('[AUTH] Password valid:', isValid)
          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role

        // Ensure user has a company (create if needed)
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { companyId: true },
        })
        if (!user?.companyId) {
          const company = await prisma.company.create({
            data: {
              name: `Company of ${session.user.name || session.user.email}`,
              adminId: token.sub,
            },
          })
          await prisma.user.update({
            where: { id: token.sub },
            data: { companyId: company.id },
          })
        }
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
