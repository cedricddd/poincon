import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/roles'

export async function requireAdminWithCompany() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, companyId: true },
  })

  if (!admin?.role || !isAdminRole(admin.role) || !admin.companyId) return null
  return {
    session,
    admin: { id: admin.id, role: admin.role, companyId: admin.companyId as string },
  }
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
