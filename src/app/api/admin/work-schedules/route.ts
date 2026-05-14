import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return isAdminRole(user?.role) ? session : null
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const schedules = await prisma.workSchedule.findMany({
    orderBy: [{ isPreset: 'desc' }, { type: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ schedules })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, type, startTime, endTime, hoursPerDay, weeklyHours, daysOfWeek, description } = body

  if (!name || !type || !startTime || !endTime) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const schedule = await prisma.workSchedule.create({
    data: {
      name,
      type,
      startTime,
      endTime,
      hoursPerDay: hoursPerDay ?? 8,
      weeklyHours: weeklyHours ?? 38,
      daysOfWeek: JSON.stringify(daysOfWeek ?? [1, 2, 3, 4, 5]),
      description: description ?? null,
      isPreset: false,
    },
  })
  return NextResponse.json(schedule, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, name, type, startTime, endTime, hoursPerDay, weeklyHours, daysOfWeek, description } = body
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const existing = await prisma.workSchedule.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const schedule = await prisma.workSchedule.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(type && { type }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(hoursPerDay !== undefined && { hoursPerDay }),
      ...(weeklyHours !== undefined && { weeklyHours }),
      ...(daysOfWeek && { daysOfWeek: JSON.stringify(daysOfWeek) }),
      ...(description !== undefined && { description }),
    },
  })
  return NextResponse.json(schedule)
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const existing = await prisma.workSchedule.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  await prisma.workSchedule.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
