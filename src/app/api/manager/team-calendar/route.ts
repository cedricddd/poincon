import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== 'MANAGER' && user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

  const today = new Date()
  const in30days = new Date(today)
  in30days.setDate(today.getDate() + 30)

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
