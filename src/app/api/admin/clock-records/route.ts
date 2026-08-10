import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { applyClockCorrection, isValidEditReason, fmtBrussels, fmtDateBrussels } from '@/lib/clock-record'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const authData = await requireAdminWithCompany()
  if (!authData) return forbiddenError()

  const overtimes = await prisma.detectedOvertime.findMany({
    where: { user: { companyId: authData.admin.companyId } },
    include: { user: { select: { name: true, email: true } }, approver: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ overtimes })
}

export async function PATCH(req: NextRequest) {
  const authData = await requireAdminWithCompany()
  if (!authData) return forbiddenError()

  const body = await req.json()
  const { id, date, arrivalTime, departureTime, location, reason, note } = body

  if (!id || !date || !arrivalTime) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const editReason = isValidEditReason(reason) ? reason : 'correction'
  if (editReason === 'other' && !note?.trim()) {
    return NextResponse.json({ error: 'Une remarque est requise pour le motif « autre »' }, { status: 400 })
  }

  const result = await applyClockCorrection({
    companyId: authData.admin.companyId,
    recordId: id,
    date: new Date(date),
    arrival: new Date(arrivalTime),
    departure: departureTime ? new Date(departureTime) : null,
    location,
    editedById: authData.admin.id,
    editReason,
    editNote: note,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logAudit({
    userId: authData.admin.id,
    action: 'admin_edit',
    resource: 'clockRecord',
    resourceId: id,
    changes: {
      reason: editReason,
      note: note ?? null,
      before: result.before,
      after: result.after,
    },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const authData = await requireAdminWithCompany()
  if (!authData) return forbiddenError()

  const body = await req.json()
  const { userId, date, arrivalTime, departureTime, location, reason, note } = body

  if (!userId || !date || !arrivalTime) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const editReason = isValidEditReason(reason) ? reason : 'manual_create'
  if (editReason === 'other' && !note?.trim()) {
    return NextResponse.json({ error: 'Une remarque est requise pour le motif « autre »' }, { status: 400 })
  }

  const result = await applyClockCorrection({
    companyId: authData.admin.companyId,
    userId,
    date: new Date(date),
    arrival: new Date(arrivalTime),
    departure: departureTime ? new Date(departureTime) : null,
    location,
    editedById: authData.admin.id,
    editReason,
    editNote: note,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logAudit({
    userId: authData.admin.id,
    action: 'admin_create',
    resource: 'clockRecord',
    resourceId: result.recordId,
    changes: {
      reason: editReason,
      note: note ?? null,
      after: result.after,
    },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true, id: result.recordId })
}

export async function DELETE(req: NextRequest) {
  const authData = await requireAdminWithCompany()
  if (!authData) return forbiddenError()

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const existing = await prisma.clockRecord.findFirst({
    where: { id, user: { companyId: authData.admin.companyId } },
  })
  if (!existing) return NextResponse.json({ error: 'Pointage introuvable' }, { status: 404 })

  await prisma.clockRecord.delete({ where: { id } })

  await logAudit({
    userId: authData.admin.id,
    action: 'admin_delete',
    resource: 'clockRecord',
    resourceId: id,
    changes: {
      date: fmtDateBrussels(existing.date),
      arrivalTime: fmtBrussels(existing.arrivalTime),
      departureTime: fmtBrussels(existing.departureTime),
      location: existing.location,
    },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
