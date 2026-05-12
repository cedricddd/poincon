import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function requireAdminWithCompany() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, companyId: true },
  })

  if (!admin?.role || admin.role !== 'ADMIN' || !admin.companyId) return null
  return { session, admin }
}

export async function canAccessUser(adminCompanyId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  })
  return user?.companyId === adminCompanyId
}

export async function forbiddenError() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
