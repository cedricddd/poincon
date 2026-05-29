import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return isAdminRole(user?.role) ? session : null
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  const isAdvanced = planCanAccess(plan, 'advanced_reports')

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })
  if (!adminUser?.companyId) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50

  // Advanced filters only available on paid plans
  const userId = isAdvanced ? (searchParams.get('userId') || undefined) : undefined
  const siteId = isAdvanced ? (searchParams.get('siteId') || undefined) : undefined
  const from = isAdvanced ? searchParams.get('from') : null
  const to = isAdvanced ? searchParams.get('to') : null

  const where = {
    user: { companyId: adminUser.companyId },
    ...(userId ? { userId } : {}),
    ...(siteId ? { siteId } : {}),
    ...(from || to ? {
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
      },
    } : {}),
  }

  const [total, records] = await Promise.all([
    prisma.clockRecord.count({ where }),
    prisma.clockRecord.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  // Stats only computed for paid plans
  let stats = null
  if (isAdvanced) {
    const allRecords = await prisma.clockRecord.findMany({
      where: { ...where, departureTime: { not: null } },
      select: { duration: true },
    })
    const totalMinutes = allRecords.reduce((sum, r) => sum + (r.duration ?? 0), 0)
    const completedCount = allRecords.length
    const avgMinutes = completedCount > 0 ? Math.round(totalMinutes / completedCount) : 0

    const overtimeWhere = {
      user: { companyId: adminUser.companyId },
      ...(userId ? { userId } : {}),
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
        },
      } : {}),
    }
    const overtimeAgg = await prisma.detectedOvertime.aggregate({
      where: overtimeWhere,
      _sum: { overtimeHours: true },
    })

    stats = {
      totalMinutes,
      avgMinutes,
      completedCount,
      incompleteCount: total - completedCount,
      overtimeHours: overtimeAgg._sum.overtimeHours ?? 0,
    }
  }

  return NextResponse.json({
    records,
    total,
    page,
    pages: Math.ceil(total / limit),
    plan,
    isAdvanced,
    stats,
  })
}
