import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { logAudit } from '@/lib/audit'
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

  const { userId, startDate, endDate, reason, leaveType } = await req.json()
  if (!userId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Champs requis: userId, startDate, endDate' }, { status: 400 })
  }

  const memberIds = await requireManagerScope(session.user.id)
  if (!memberIds.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const validLeaveTypes = ['ANNUAL', 'SICK', 'MATERNITY']
  const resolvedLeaveType = validLeaveTypes.includes(leaveType) ? leaveType : 'ANNUAL'
  const record = await prisma.timeOffRequest.create({
    data: {
      userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      leaveType: resolvedLeaveType,
      reason: reason ?? null,
      status: 'APPROVED',
      approvedBy: session.user.id,
      approvedAt: new Date(),
    },
  })

  await Promise.all([
    prisma.notification.create({
      data: { userId, message: 'Congé enregistré par votre manager', type: 'info' },
    }),
    logAudit({
      userId: session.user.id,
      action: 'manager_create',
      resource: 'timeOff',
      resourceId: record.id,
      changes: { targetUserId: userId, startDate, endDate, leaveType: resolvedLeaveType, reason: reason ?? null, status: 'APPROVED' },
    }),
  ])

  return NextResponse.json({ record }, { status: 201 })
}
