import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
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

  const existing = await prisma.clockRecord.findFirst({
    where: { id, user: { companyId: authData.admin.companyId } },
    include: { breaks: { where: { endedAt: { not: null } } } },
  })
  if (!existing) return NextResponse.json({ error: 'Pointage introuvable' }, { status: 404 })

  const arrival = buildDateTime(date, arrivalTime)
  const departure = departureTime ? buildDateTime(date, departureTime) : null

  let newDuration: number | null = null
  if (departure) {
    const totalMinutes = Math.round((departure.getTime() - arrival.getTime()) / 60000)
    const breakMinutes = existing.breaks.reduce((sum, b) => {
      return sum + Math.round((b.endedAt!.getTime() - b.startedAt.getTime()) / 60000)
    }, 0)
    newDuration = Math.max(0, totalMinutes - breakMinutes)
  }

  const updated = await prisma.clockRecord.update({
    where: { id },
    data: {
      date: new Date(date),
      arrivalTime: arrival,
      departureTime: departure,
      location: location ?? existing.location,
      duration: newDuration,
    },
  })

  await logAudit({
    userId: authData.admin.id,
    action: 'admin_edit',
    resource: 'clockRecord',
    resourceId: id,
    changes: {
      reason: reason ?? 'other',
      note: note ?? null,
      before: {
        date: existing.date,
        arrivalTime: existing.arrivalTime,
        departureTime: existing.departureTime,
        location: existing.location,
        duration: existing.duration,
      },
      after: {
        date: updated.date,
        arrivalTime: updated.arrivalTime,
        departureTime: updated.departureTime,
        location: updated.location,
        duration: updated.duration,
      },
    },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const authData = await requireAdminWithCompany()
  if (!authData) return forbiddenError()

  const body = await req.json()
  const { userId, date, arrivalTime, departureTime, location } = body

  if (!userId || !date || !arrivalTime) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId: authData.admin.companyId },
  })
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const arrival = buildDateTime(date, arrivalTime)
  const departure = departureTime ? buildDateTime(date, departureTime) : null
  const duration = departure
    ? Math.round((departure.getTime() - arrival.getTime()) / 60000)
    : null

  const record = await prisma.clockRecord.create({
    data: {
      userId,
      date: new Date(date),
      arrivalTime: arrival,
      departureTime: departure,
      location: location ?? 'Sur site',
      duration,
    },
  })

  await logAudit({
    userId: authData.admin.id,
    action: 'admin_create',
    resource: 'clockRecord',
    resourceId: record.id,
    changes: {
      reason: 'manual_create',
      date,
      arrivalTime,
      departureTime: departureTime ?? null,
      location: location ?? 'Sur site',
    },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true, id: record.id })
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
      date: existing.date,
      arrivalTime: existing.arrivalTime,
      departureTime: existing.departureTime,
      location: existing.location,
    },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}

function buildDateTime(dateStr: string, timeStr: string): Date {
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr
  return new Date(`${dateStr}T${t}`)
}
