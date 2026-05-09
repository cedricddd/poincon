import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return user?.role === 'ADMIN' ? session : null
}

function calcDuration(arrival: Date, departure: Date | null): number | null {
  if (!departure) return null
  return Math.round((departure.getTime() - arrival.getTime()) / 60000)
}

// Combine a date string "YYYY-MM-DD" with a time string "HH:MM" into a UTC Date
function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, date, arrivalTime, departureTime, location } = await req.json()
  if (!userId || !date || !arrivalTime) {
    return NextResponse.json({ error: 'userId, date et arrivalTime sont requis' }, { status: 400 })
  }

  const arrival = combineDateTime(date, arrivalTime)
  const departure = departureTime ? combineDateTime(date, departureTime) : null
  const duration = calcDuration(arrival, departure)

  const record = await prisma.clockRecord.create({
    data: {
      userId,
      date: new Date(date),
      arrivalTime: arrival,
      departureTime: departure,
      duration,
      location: location ?? 'Sur site',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_create',
      resource: 'clockRecord',
      resourceId: record.id,
      changes: JSON.stringify({ date, arrivalTime, departureTime, location }),
    },
  })

  return NextResponse.json({ record })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, date, arrivalTime, departureTime, location } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const existing = await prisma.clockRecord.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Pointage introuvable' }, { status: 404 })

  const baseDate = date ?? existing.date.toISOString().slice(0, 10)
  const arrival = arrivalTime ? combineDateTime(baseDate, arrivalTime) : existing.arrivalTime
  const departure = departureTime === null
    ? null
    : departureTime
      ? combineDateTime(baseDate, departureTime)
      : existing.departureTime
  const duration = calcDuration(arrival, departure)

  const record = await prisma.clockRecord.update({
    where: { id },
    data: {
      date: date ? new Date(date) : existing.date,
      arrivalTime: arrival,
      departureTime: departure,
      duration,
      location: location ?? existing.location,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_edit',
      resource: 'clockRecord',
      resourceId: id,
      changes: JSON.stringify({ date, arrivalTime, departureTime, location }),
    },
  })

  return NextResponse.json({ record })
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  await prisma.clockRecord.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_delete',
      resource: 'clockRecord',
      resourceId: id,
    },
  })

  return NextResponse.json({ success: true })
}
