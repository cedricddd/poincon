import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function requireManagerScope(sessionUserId: string) {
  const managedTeams = await prisma.teamMember.findMany({
    where: { userId: sessionUserId, role: 'manager' },
    select: { teamId: true },
  })
  const teamIds = managedTeams.map(t => t.teamId)
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId: { in: teamIds } },
    select: { userId: true },
  })
  return [...new Set(teamMembers.map(m => m.userId))]
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (!user || !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'managers')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'weekStart requis (YYYY-MM-DD)' }, { status: 400 })
  }

  const memberIds = await requireManagerScope(session.user.id)
  const weekStartDate = new Date(weekStart + 'T00:00:00.000Z')
  const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [shifts, users, timeOffs] = await Promise.all([
    prisma.shift.findMany({
      where: {
        userId: { in: memberIds },
        date: { gte: weekStartDate, lt: weekEndDate },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.user.findMany({
      where: { id: { in: memberIds }, active: true, deletedAt: null },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.timeOffRequest.findMany({
      where: {
        userId: { in: memberIds },
        status: 'APPROVED',
        startDate: { lt: weekEndDate },
        endDate: { gte: weekStartDate },
      },
      select: { userId: true, startDate: true, endDate: true },
    }),
  ])

  return NextResponse.json({ shifts, users, timeOffs })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (!user || !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'managers')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const { userId, siteId, date, startTime, endTime, note } = await req.json()
  if (!userId || !date || !startTime || !endTime) {
    return NextResponse.json({ error: 'Champs requis: userId, date, startTime, endTime' }, { status: 400 })
  }

  const memberIds = await requireManagerScope(session.user.id)
  if (!memberIds.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const shift = await prisma.shift.create({
    data: {
      userId,
      siteId: siteId ?? null,
      date: new Date(date + 'T00:00:00.000Z'),
      startTime,
      endTime,
      note: note ?? null,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ shift }, { status: 201 })
}
