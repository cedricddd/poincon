import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function requireManagerMemberIds(sessionUserId: string): Promise<string[]> {
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

async function requireManagerSession(sessionUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { role: true } })
  if (!user || !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
  const plan = await getUserPlan(sessionUserId)
  if (!planCanAccess(plan, 'managers')) return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!await requireManagerSession(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const memberIds = await requireManagerMemberIds(session.user.id)
  const shift = await prisma.shift.findFirst({ where: { id, userId: { in: memberIds } } })
  if (!shift) return NextResponse.json({ error: 'Shift introuvable' }, { status: 404 })

  const { siteId, date, startTime, endTime, shiftType, note } = await req.json()

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      ...(siteId !== undefined && { siteId: siteId ?? null }),
      ...(date && { date: new Date(date + 'T00:00:00.000Z') }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(shiftType && { shiftType }),
      ...(note !== undefined && { note: note ?? null }),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ shift: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!await requireManagerSession(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const memberIds = await requireManagerMemberIds(session.user.id)
  const shift = await prisma.shift.findFirst({ where: { id, userId: { in: memberIds } } })
  if (!shift) return NextResponse.json({ error: 'Shift introuvable' }, { status: 404 })

  await prisma.shift.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
