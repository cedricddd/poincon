import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getCompanyPlan, planCanAccess, PLAN_LIMITS } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

async function requireAdmin(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!isAdminRole(user?.role)) return null
  return session
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin(req)
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })
    if (!admin?.companyId) return NextResponse.json({ error: 'Company not found' }, { status: 400 })

    const [users, plan, presenceFlag] = await Promise.all([
      prisma.user.findMany({
        where: { companyId: admin.companyId },
        select: {
          id: true, name: true, email: true, role: true, createdAt: true,
          defaultSiteId: true,
          defaultSite: { select: { id: true, name: true } },
          managerId: true,
          manager: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: 'asc' },
      }),
      getCompanyPlan(admin.companyId),
      prisma.companyFeatureFlag.findFirst({
        where: { companyId: admin.companyId, flag: 'presences', enabled: true },
      }),
    ])

    const limits = PLAN_LIMITS[plan]
    const canPresences = planCanAccess(plan, 'presences') || !!presenceFlag
    return NextResponse.json({
      users,
      canUseManagers: planCanAccess(plan, 'managers'),
      planInfo: {
        plan,
        maxEmployees: limits.maxEmployees,
        maxManagers: limits.maxManagers,
        canTeams: planCanAccess(plan, 'teams'),
        canManagers: planCanAccess(plan, 'managers'),
        canPresences,
        canAdvancedReports: planCanAccess(plan, 'advanced_reports'),
        canUnlimitedCsv: planCanAccess(plan, 'unlimited_csv_export'),
        csvExportsPerMonth: limits.csvExportsPerMonth,
        maxSites: limits.maxSites,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin(req)
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { id, name, email, role, password, defaultSiteId } = body
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })
    if (!admin?.companyId) return NextResponse.json({ error: 'Company not found' }, { status: 400 })

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { companyId: true },
    })
    if (!targetUser || targetUser.companyId !== admin.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedRoles = ['EMPLOYEE', 'MANAGER', 'ADMIN']
    const data: Record<string, unknown> = {}
    if (name) data.name = name
    if (email) data.email = email
    if (role && allowedRoles.includes(role)) {
      if (role === 'MANAGER') {
        const plan = await getCompanyPlan(admin.companyId)
        if (!planCanAccess(plan, 'managers')) {
          return NextResponse.json({ error: 'Votre plan ne permet pas d\'ajouter des managers' }, { status: 403 })
        }
      }
      data.role = role
    }
    if (password) data.password = await bcrypt.hash(password, 10)
    if ('defaultSiteId' in body) data.defaultSiteId = defaultSiteId ?? null
    if ('managerId' in body) {
      const mid = body.managerId ?? null
      if (mid) {
        const mgr = await prisma.user.findUnique({ where: { id: mid }, select: { companyId: true, role: true } })
        if (!mgr || mgr.companyId !== admin.companyId || mgr.role !== 'MANAGER') {
          return NextResponse.json({ error: 'Manager invalide' }, { status: 400 })
        }
      }
      data.managerId = mid
    }

    const user = await prisma.user.update({ where: { id }, data })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'admin_update_user',
        resource: 'User',
        resourceId: id,
        changes: JSON.stringify({ name, email, role, passwordChanged: !!password }),
      },
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin(req)
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    if (id === session.user.id) {
      return NextResponse.json({ error: 'Impossible de supprimer votre propre compte' }, { status: 400 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })
    if (!admin?.companyId) return NextResponse.json({ error: 'Company not found' }, { status: 400 })

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { companyId: true },
    })
    if (!targetUser || targetUser.companyId !== admin.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Anonymiser les audit logs avant suppression (RGPD)
    const token = createHash('sha256').update(id).digest('hex').slice(0, 16)
    await prisma.auditLog.updateMany({
      where: { userId: id, anonymized: false },
      data: { userId: null, anonymizedToken: token, anonymized: true },
    })

    await prisma.user.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'admin_delete_user',
        resource: 'User',
        resourceId: id,
        changes: JSON.stringify({}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
