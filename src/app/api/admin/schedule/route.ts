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

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Return all users with their schedule (or null if none assigned)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      userSchedule: {
        include: { workSchedule: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Shape to match previous API + new data
  const schedules = users.map(u => ({
    userId: u.id,
    user: { id: u.id, name: u.name, email: u.email },
    hoursPerDay: u.userSchedule?.hoursPerDay ?? 8,
    scheduleId: u.userSchedule?.scheduleId ?? null,
    workSchedule: u.userSchedule?.workSchedule ?? null,
  }))

  return NextResponse.json({ schedules })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, scheduleType } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  let resolvedHours = 8
  let resolvedScheduleId: string | null = null

  if (scheduleType) {
    // Find canonical preset for this type to get hoursPerDay
    const preset = await prisma.workSchedule.findFirst({
      where: { type: scheduleType, isPreset: true },
    })
    if (!preset) return NextResponse.json({ error: 'Type d\'horaire inconnu' }, { status: 400 })
    resolvedHours = preset.hoursPerDay
    resolvedScheduleId = preset.id
  }

  const schedule = await prisma.userSchedule.upsert({
    where: { userId },
    update: { hoursPerDay: resolvedHours, scheduleId: resolvedScheduleId },
    create: { userId, hoursPerDay: resolvedHours, scheduleId: resolvedScheduleId },
    include: { workSchedule: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_update_schedule',
      resource: 'UserSchedule',
      resourceId: userId,
      changes: JSON.stringify({ scheduleType, hoursPerDay: resolvedHours }),
    },
  })

  return NextResponse.json(schedule)
}
