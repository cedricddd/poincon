import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return user?.role === 'ADMIN' ? session : null
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'advanced_reports')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || undefined
  const siteId = searchParams.get('siteId') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50

  const where = {
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

  // Aggregate stats
  const allRecords = await prisma.clockRecord.findMany({
    where: { ...where, departureTime: { not: null } },
    select: { duration: true },
  })
  const totalMinutes = allRecords.reduce((sum, r) => sum + (r.duration ?? 0), 0)
  const completedCount = allRecords.length
  const avgMinutes = completedCount > 0 ? Math.round(totalMinutes / completedCount) : 0

  // Count detected overtimes matching the same filters
  const overtimeWhere = {
    ...(userId ? { userId } : {}),
    ...(from || to ? {
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
      },
    } : {}),
  }
  const overtimeMinutes = await prisma.detectedOvertime.aggregate({
    where: overtimeWhere,
    _sum: { overtimeHours: true },
  })

  return NextResponse.json({
    records,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: {
      totalMinutes,
      avgMinutes,
      completedCount,
      incompleteCount: total - completedCount,
      overtimeHours: overtimeMinutes._sum.overtimeHours ?? 0,
    },
  })
}
