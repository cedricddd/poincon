import { requireAdminWithCompany, forbiddenError, canAccessUser } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const users = await prisma.user.findMany({
    where: { companyId: auth.admin.companyId },
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
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { userId, scheduleId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  if (!(await canAccessUser(auth.admin.companyId, userId))) {
    return forbiddenError()
  }

  let resolvedHours = 8
  let resolvedScheduleId: string | null = null

  if (scheduleId) {
    const ws = await prisma.workSchedule.findUnique({ where: { id: scheduleId } })
    if (!ws) return NextResponse.json({ error: 'Gabarit introuvable' }, { status: 400 })
    resolvedHours = ws.hoursPerDay
    resolvedScheduleId = ws.id
  }

  const schedule = await prisma.userSchedule.upsert({
    where: { userId },
    update: { hoursPerDay: resolvedHours, scheduleId: resolvedScheduleId },
    create: { userId, hoursPerDay: resolvedHours, scheduleId: resolvedScheduleId },
    include: { workSchedule: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: 'admin_update_schedule',
      resource: 'UserSchedule',
      resourceId: userId,
      changes: JSON.stringify({ scheduleId: resolvedScheduleId, hoursPerDay: resolvedHours }),
    },
  })

  return NextResponse.json(schedule)
}
