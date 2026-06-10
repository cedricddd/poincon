import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function getShiftForAdmin(id: string, companyId: string) {
  return prisma.shift.findFirst({
    where: { id, user: { companyId } },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { id } = await params
  const shift = await getShiftForAdmin(id, auth.admin.companyId)
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

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: 'admin_update',
      resource: 'shift',
      resourceId: id,
      changes: JSON.stringify({ siteId, date, startTime, endTime, shiftType, note }),
    },
  })

  return NextResponse.json({ shift: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { id } = await params
  const shift = await getShiftForAdmin(id, auth.admin.companyId)
  if (!shift) return NextResponse.json({ error: 'Shift introuvable' }, { status: 404 })

  await prisma.shift.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: 'admin_delete',
      resource: 'shift',
      resourceId: id,
    },
  })

  return NextResponse.json({ success: true })
}
