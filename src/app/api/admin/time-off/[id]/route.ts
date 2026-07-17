import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import { validLeaveTypes } from '../route'

async function findScopedRequest(id: string, companyId: string) {
  const record = await prisma.timeOffRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, companyId: true } } },
  })
  if (!record || record.user.companyId !== companyId) return null
  return record
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { id } = await params
  const record = await findScopedRequest(id, auth.admin.companyId)
  if (!record) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const { startDate, endDate, reason, leaveType } = await req.json()
  if (!startDate || !endDate) return NextResponse.json({ error: 'Champs requis' }, { status: 400 })

  const resolvedLeaveType = validLeaveTypes.includes(leaveType) ? leaveType : record.leaveType
  const updated = await prisma.timeOffRequest.update({
    where: { id },
    data: {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      leaveType: resolvedLeaveType,
      reason: reason ?? null,
    },
  })

  await Promise.all([
    prisma.notification.create({ data: { userId: record.userId, message: 'Congé modifié', type: 'info' } }),
    logAudit({
      userId: auth.session.user.id,
      action: 'admin_update',
      resource: 'timeOff',
      resourceId: id,
      changes: { targetUserId: record.userId, startDate, endDate, leaveType: resolvedLeaveType, reason: reason ?? null },
    }),
  ])

  return NextResponse.json({ record: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { id } = await params
  const record = await findScopedRequest(id, auth.admin.companyId)
  if (!record) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  await prisma.timeOffRequest.delete({ where: { id } })

  await Promise.all([
    prisma.notification.create({ data: { userId: record.userId, message: 'Congé supprimé', type: 'info' } }),
    logAudit({
      userId: auth.session.user.id,
      action: 'admin_delete',
      resource: 'timeOff',
      resourceId: id,
      changes: { targetUserId: record.userId, startDate: record.startDate, endDate: record.endDate, leaveType: record.leaveType },
    }),
  ])

  return NextResponse.json({ success: true })
}
