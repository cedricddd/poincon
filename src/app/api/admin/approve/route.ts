import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendApprovalEmail } from '@/lib/mail'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { type, requestId, action, rejectionReason } = await req.json()

    if (!type || !requestId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validActions = ['approve', 'reject']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const now = new Date()
    let result

    const typeLabels: Record<string, string> = {
      overtime: "d'heures supplémentaires",
      timeoff: 'de congé',
      rtt: 'RTT',
    }

    switch (type) {
      case 'overtime':
        result = await prisma.detectedOvertime.update({
          where: { id: requestId },
          data: {
            status: action === 'approve' ? 'APPROVED' : 'REJECTED',
            approvedBy: session.user.id,
            approvedAt: now,
            rejectionReason: action === 'reject' ? rejectionReason : null,
          },
        })
        break

      case 'timeoff':
        result = await prisma.timeOffRequest.update({
          where: { id: requestId },
          data: {
            status: action === 'approve' ? 'APPROVED' : 'REJECTED',
            approvedBy: session.user.id,
            approvedAt: now,
            rejectionReason: action === 'reject' ? rejectionReason : null,
          },
        })
        break

      case 'rtt':
        result = await prisma.rTTRequest.update({
          where: { id: requestId },
          data: {
            status: action === 'approve' ? 'APPROVED' : 'REJECTED',
            approvedBy: session.user.id,
            approvedAt: now,
            rejectionReason: action === 'reject' ? rejectionReason : null,
          },
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Create notification for the employee
    const notifMessage =
      action === 'approve'
        ? `Votre demande ${typeLabels[type]} a été approuvée.`
        : `Votre demande ${typeLabels[type]} a été refusée.${rejectionReason ? ` Motif : ${rejectionReason}` : ''}`

    await prisma.notification.create({
      data: {
        userId: result.userId,
        message: notifMessage,
        type: action === 'approve' ? 'success' : 'error',
      },
    })

    // Send email notification (fire and forget — ne bloque pas la réponse)
    const employee = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { email: true, name: true },
    })
    if (employee) {
      sendApprovalEmail({
        to: employee.email,
        name: employee.name,
        type: type as 'overtime' | 'timeoff' | 'rtt',
        action: action as 'approve' | 'reject',
        rejectionReason,
      }).catch(err => console.error('Mail send failed:', err))
    }

    // Log the action in audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `admin_${action}`,
        resource: type,
        resourceId: requestId,
        changes: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' }),
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Approval action failed:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
