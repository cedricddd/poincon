import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendApprovalEmail } from '@/lib/mail'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function getManagerTeamMemberIds(managerId: string): Promise<string[]> {
  const managedTeams = await prisma.teamMember.findMany({
    where: { userId: managerId, role: 'manager' },
    select: { teamId: true },
  })
  const teamIds = managedTeams.map(t => t.teamId)
  if (teamIds.length === 0) return []

  const members = await prisma.teamMember.findMany({
    where: { teamId: { in: teamIds } },
    select: { userId: true },
  })
  return [...new Set(members.map(m => m.userId))]
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (user?.role !== 'MANAGER' && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const plan = await getUserPlan(session.user.id)
    if (!planCanAccess(plan, 'managers')) {
      return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
    }

    const { type, requestId, action, rejectionReason } = await req.json()
    if (!type || !requestId || !action) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const memberIds = await getManagerTeamMemberIds(session.user.id)

    const typeLabels: Record<string, string> = {
      overtime: "d'heures supplémentaires",
      timeoff: 'de congé',
      rtt: 'RTT',
    }

    const now = new Date()
    let result

    switch (type) {
      case 'overtime': {
        const record = await prisma.detectedOvertime.findUnique({ where: { id: requestId }, select: { userId: true } })
        if (!record || !memberIds.includes(record.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        result = await prisma.detectedOvertime.update({
          where: { id: requestId },
          data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED', approvedBy: session.user.id, approvedAt: now, rejectionReason: action === 'reject' ? rejectionReason : null },
        })
        break
      }
      case 'timeoff': {
        const record = await prisma.timeOffRequest.findUnique({ where: { id: requestId }, select: { userId: true } })
        if (!record || !memberIds.includes(record.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        result = await prisma.timeOffRequest.update({
          where: { id: requestId },
          data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED', approvedBy: session.user.id, approvedAt: now, rejectionReason: action === 'reject' ? rejectionReason : null },
        })
        break
      }
      case 'rtt': {
        const record = await prisma.rTTRequest.findUnique({ where: { id: requestId }, select: { userId: true } })
        if (!record || !memberIds.includes(record.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        result = await prisma.rTTRequest.update({
          where: { id: requestId },
          data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED', approvedBy: session.user.id, approvedAt: now, rejectionReason: action === 'reject' ? rejectionReason : null },
        })
        break
      }
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const notifMessage =
      action === 'approve'
        ? `Votre demande ${typeLabels[type]} a été approuvée.`
        : `Votre demande ${typeLabels[type]} a été refusée.${rejectionReason ? ` Motif : ${rejectionReason}` : ''}`

    await prisma.notification.create({
      data: { userId: result.userId, message: notifMessage, type: action === 'approve' ? 'success' : 'error' },
    })

    const employee = await prisma.user.findUnique({ where: { id: result.userId }, select: { email: true, name: true } })
    if (employee) {
      sendApprovalEmail({ to: employee.email, name: employee.name, type: type as 'overtime' | 'timeoff' | 'rtt', action: action as 'approve' | 'reject', rejectionReason })
        .catch(err => console.error('Mail send failed:', err))
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `manager_${action}`,
        resource: type,
        resourceId: requestId,
        changes: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' }),
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Manager approval failed:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
