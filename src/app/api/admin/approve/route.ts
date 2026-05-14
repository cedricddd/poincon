import { prisma } from '@/lib/prisma'
import { requireAdminWithCompany, forbiddenError, canAccessUser } from '@/lib/admin-security'
import { sendApprovalEmail } from '@/lib/mail'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminWithCompany()
    if (!auth) {
      return forbiddenError()
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
        const overtime = await prisma.detectedOvertime.findUnique({
          where: { id: requestId },
          select: { userId: true },
        })
        if (!overtime || !(await canAccessUser(auth.admin.companyId, overtime.userId))) {
          return forbiddenError()
        }
        result = await prisma.detectedOvertime.update({
          where: { id: requestId },
          data: {
            status: action === 'approve' ? 'APPROVED' : 'REJECTED',
            approvedBy: auth.admin.id,
            approvedAt: now,
            rejectionReason: action === 'reject' ? rejectionReason : null,
          },
        })
        break

      case 'timeoff':
        const timeoff = await prisma.timeOffRequest.findUnique({
          where: { id: requestId },
          select: { userId: true },
        })
        if (!timeoff || !(await canAccessUser(auth.admin.companyId, timeoff.userId))) {
          return forbiddenError()
        }
        result = await prisma.timeOffRequest.update({
          where: { id: requestId },
          data: {
            status: action === 'approve' ? 'APPROVED' : 'REJECTED',
            approvedBy: auth.admin.id,
            approvedAt: now,
            rejectionReason: action === 'reject' ? rejectionReason : null,
          },
        })
        break

      case 'rtt':
        const rtt = await prisma.rTTRequest.findUnique({
          where: { id: requestId },
          select: { userId: true },
        })
        if (!rtt || !(await canAccessUser(auth.admin.companyId, rtt.userId))) {
          return forbiddenError()
        }
        result = await prisma.rTTRequest.update({
          where: { id: requestId },
          data: {
            status: action === 'approve' ? 'APPROVED' : 'REJECTED',
            approvedBy: auth.admin.id,
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
