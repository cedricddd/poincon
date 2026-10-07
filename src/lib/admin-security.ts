import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/roles'

export async function requireAdminWithCompany() {
  const session = await auth()
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

// A shift's site must belong to the same company as the shift's employee
// (siteId comes from the request body: reject sites of another tenant).
export async function isSiteAllowedForUser(siteId: string | null | undefined, userId: string) {
  if (!siteId) return true
  const [site, user] = await Promise.all([
    prisma.site.findUnique({ where: { id: siteId }, select: { companyId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }),
  ])
  return !!site && !!user?.companyId && site.companyId === user.companyId
}

export async function forbiddenError() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
