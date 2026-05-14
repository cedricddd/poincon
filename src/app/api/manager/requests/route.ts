import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function requireManager() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? session : null
}

export async function GET(req: NextRequest) {
  const session = await requireManager()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'managers')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  // Trouver les équipes où cet utilisateur est manager
  const managedTeams = await prisma.teamMember.findMany({
    where: { userId: session.user.id, role: 'manager' },
    select: { teamId: true },
  })
  const teamIds = managedTeams.map(t => t.teamId)

  // Trouver tous les membres de ces équipes
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId: { in: teamIds } },
    select: { userId: true },
  })
  const memberIds = [...new Set(teamMembers.map(m => m.userId))]

  const [overtimes, timeOffs, rtts] = await Promise.all([
    prisma.detectedOvertime.findMany({
      where: { userId: { in: memberIds } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.timeOffRequest.findMany({
      where: { userId: { in: memberIds } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rTTRequest.findMany({
      where: { userId: { in: memberIds } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const statusOrder = (s: string) => (s === 'PENDING' ? 0 : 1)
  const sort = <T extends { status: string }>(arr: T[]) =>
    [...arr].sort((a, b) => statusOrder(a.status) - statusOrder(b.status))

  return NextResponse.json({
    overtimes: sort(overtimes),
    timeOffs: sort(timeOffs),
    rtts: sort(rtts),
    teamIds,
    memberIds,
  })
}
