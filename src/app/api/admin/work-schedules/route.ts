import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'
import { scheduleTotals, parseDayConfig, isValidUnpaidBreak, isValidTime } from '@/lib/work-schedule'

// Stored hours always come from the times and the unpaid break, never from the client's preview.
function storedHours(s: { startTime: string; endTime: string; daysOfWeek: number[]; dayConfig: string | null; unpaidBreakMinutes: number }) {
  const { weeklyMinutes, perDayMinutes } = scheduleTotals({ ...s, dayConfig: parseDayConfig(s.dayConfig) })
  return { hoursPerDay: perDayMinutes / 60, weeklyHours: weeklyMinutes / 60 }
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, companyId: true },
  })
  if (!isAdminRole(user?.role) || !user?.companyId) return null
  return { session, companyId: user.companyId as string }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Presets globaux (companyId null) + horaires custom de l'entreprise uniquement
  const schedules = await prisma.workSchedule.findMany({
    where: { OR: [{ companyId: null }, { companyId: admin.companyId }] },
    orderBy: [{ isPreset: 'desc' }, { type: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ schedules })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, type, startTime, endTime, daysOfWeek, description, dayConfig, unpaidBreakMinutes } = body

  if (!name || !type || !startTime || !endTime) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return NextResponse.json({ error: 'Heure invalide' }, { status: 400 })
  }
  if (unpaidBreakMinutes !== undefined && !isValidUnpaidBreak(unpaidBreakMinutes)) {
    return NextResponse.json({ error: 'Pause invalide' }, { status: 400 })
  }

  const fields = {
    startTime,
    endTime,
    daysOfWeek: (daysOfWeek ?? [1, 2, 3, 4, 5]) as number[],
    dayConfig: (dayConfig ?? null) as string | null,
    unpaidBreakMinutes: (unpaidBreakMinutes ?? 0) as number,
  }
  const schedule = await prisma.workSchedule.create({
    data: {
      companyId: admin.companyId,
      name,
      type,
      ...fields,
      ...storedHours(fields),
      daysOfWeek: JSON.stringify(fields.daysOfWeek),
      description: description ?? null,
      isPreset: false,
    },
  })
  return NextResponse.json(schedule, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, name, type, startTime, endTime, daysOfWeek, description, dayConfig, unpaidBreakMinutes } = body
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })
  if ((startTime && !isValidTime(startTime)) || (endTime && !isValidTime(endTime))) {
    return NextResponse.json({ error: 'Heure invalide' }, { status: 400 })
  }
  if (unpaidBreakMinutes !== undefined && !isValidUnpaidBreak(unpaidBreakMinutes)) {
    return NextResponse.json({ error: 'Pause invalide' }, { status: 400 })
  }

  // Seuls les horaires custom de l'entreprise sont modifiables (pas les presets globaux ni ceux d'un autre tenant)
  const existing = await prisma.workSchedule.findUnique({ where: { id } })
  if (!existing || existing.companyId !== admin.companyId) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const fields = {
    startTime: (startTime || existing.startTime) as string,
    endTime: (endTime || existing.endTime) as string,
    daysOfWeek: (daysOfWeek ?? JSON.parse(existing.daysOfWeek)) as number[],
    dayConfig: (dayConfig !== undefined ? dayConfig : existing.dayConfig) as string | null,
    unpaidBreakMinutes: (unpaidBreakMinutes ?? existing.unpaidBreakMinutes) as number,
  }
  const hours = storedHours(fields)

  const schedule = await prisma.workSchedule.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(type && { type }),
      ...fields,
      ...hours,
      daysOfWeek: JSON.stringify(fields.daysOfWeek),
      ...(description !== undefined && { description }),
    },
  })

  // People already on this template follow its new daily base (Boni/Mali, overtime threshold).
  if (hours.hoursPerDay !== existing.hoursPerDay) {
    const { count } = await prisma.userSchedule.updateMany({
      where: { scheduleId: id },
      data: { hoursPerDay: hours.hoursPerDay },
    })
    await prisma.auditLog.create({
      data: {
        userId: admin.session.user!.id!,
        action: 'admin_update_schedule_template',
        resource: 'WorkSchedule',
        resourceId: id,
        changes: JSON.stringify({ hoursPerDay: { from: existing.hoursPerDay, to: hours.hoursPerDay }, usersUpdated: count }),
      },
    })
  }

  return NextResponse.json(schedule)
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const existing = await prisma.workSchedule.findUnique({ where: { id }, select: { companyId: true } })
  if (!existing || existing.companyId !== admin.companyId) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  await prisma.workSchedule.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
