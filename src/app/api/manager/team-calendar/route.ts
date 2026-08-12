import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { brusselsDateKey } from '@/lib/clock'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== 'MANAGER' && user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'managers')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const managedTeams = await prisma.teamMember.findMany({
    where: { userId: session.user.id, role: 'manager' },
    select: { teamId: true },
  })
  const teamIds = managedTeams.map(t => t.teamId)

  const members = await prisma.teamMember.findMany({
    where: { teamId: { in: teamIds } },
    select: { userId: true },
  })
  const memberIds = [...new Set(members.map(m => m.userId))]

  // TimeOffRequest.startDate/endDate sont des sentinelles "minuit UTC = jour calendaire"
  // (créées via `new Date("YYYY-MM-DD")`), pas des instants réels — `today` doit suivre
  // la même convention pour que la comparaison avec `endDate` reste correcte toute la journée.
  const today = new Date(`${brusselsDateKey(new Date())}T00:00:00.000Z`)
  const in30days = new Date(today)
  in30days.setUTCDate(today.getUTCDate() + 30)

  const timeOffs = await prisma.timeOffRequest.findMany({
    where: {
      userId: { in: memberIds },
      status: 'APPROVED',
      endDate: { gte: today },
      startDate: { lte: in30days },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { startDate: 'asc' },
  })

  return NextResponse.json({ timeOffs })
}
