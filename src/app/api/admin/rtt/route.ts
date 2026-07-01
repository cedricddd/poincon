import { requireAdminWithCompany, canAccessUser, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { dispatchWebhookSafe } from '@/lib/webhook'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const requests = await prisma.rTTRequest.findMany({
    where: {
      user: { companyId: auth.admin.companyId },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { userId, date, hoursToRecover, reason, status } = await req.json()
  if (!userId || !date || !hoursToRecover) {
    return NextResponse.json({ error: 'userId, date et hoursToRecover sont requis' }, { status: 400 })
  }

  if (!await canAccessUser(auth.admin.companyId, userId)) {
    return forbiddenError()
  }

  const record = await prisma.rTTRequest.create({
    data: {
      userId,
      date: new Date(date),
      hoursToRecover: parseFloat(hoursToRecover),
      reason: reason ?? null,
      status: status ?? 'APPROVED',
      approvedBy: auth.session.user.id,
      approvedAt: new Date(),
    },
  })

  await prisma.notification.create({
    data: {
      userId,
      message: `Un RTT du ${date} (${hoursToRecover}h) a été enregistré par l'administrateur.`,
      type: 'info',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: 'admin_create',
      resource: 'rtt',
      resourceId: record.id,
      changes: JSON.stringify({ date, hoursToRecover, reason, status }),
    },
  })

  if (record.status === 'APPROVED') {
    dispatchWebhookSafe(auth.admin.companyId, 'rtt.approved', { rttId: record.id, userId: record.userId })
  }

  return NextResponse.json({ record })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { id, date, hoursToRecover, reason, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const existing = await prisma.rTTRequest.findUnique({
    where: { id },
    include: { user: { select: { companyId: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'RTT introuvable' }, { status: 404 })
  if (existing.user.companyId !== auth.admin.companyId) return forbiddenError()

  const record = await prisma.rTTRequest.update({
    where: { id },
    data: {
      date: date ? new Date(date) : existing.date,
      hoursToRecover: hoursToRecover !== undefined ? parseFloat(hoursToRecover) : existing.hoursToRecover,
      reason: reason !== undefined ? reason : existing.reason,
      status: status ?? existing.status,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: 'admin_edit',
      resource: 'rtt',
      resourceId: id,
      changes: JSON.stringify({ date, hoursToRecover, reason, status }),
    },
  })

  return NextResponse.json({ record })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const existing = await prisma.rTTRequest.findUnique({
    where: { id },
    include: { user: { select: { companyId: true } } },
  })
  if (!existing || existing.user.companyId !== auth.admin.companyId) return forbiddenError()

  await prisma.rTTRequest.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: 'admin_delete',
      resource: 'rtt',
      resourceId: id,
    },
  })

  return NextResponse.json({ success: true })
}
