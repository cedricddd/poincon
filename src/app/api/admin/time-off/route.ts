import { requireAdminWithCompany, canAccessUser, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const requests = await prisma.timeOffRequest.findMany({
    where: { user: { companyId: auth.admin.companyId } },
    include: { user: { select: { id: true, name: true, email: true } }, approver: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()
  const { userId, startDate, endDate, reason, status } = await req.json()
  if (!userId || !startDate || !endDate) return NextResponse.json({ error: 'Champs requis' }, { status: 400 })
  if (!await canAccessUser(auth.admin.companyId, userId)) return forbiddenError()

  const record = await prisma.timeOffRequest.create({
    data: { userId, startDate: new Date(startDate), endDate: new Date(endDate), reason: reason ?? null, status: status ?? 'APPROVED', approvedBy: auth.session.user.id, approvedAt: new Date() },
  })
  await prisma.notification.create({ data: { userId, message: 'Congé enregistré', type: 'info' } })
  await prisma.auditLog.create({ data: { userId: auth.session.user.id, action: 'admin_create', resource: 'timeOff', resourceId: record.id, changes: JSON.stringify({ startDate, endDate, reason, status }) } })
  return NextResponse.json({ record })
}
