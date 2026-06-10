import { requireAdminWithCompany, canAccessUser, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'weekStart requis (YYYY-MM-DD)' }, { status: 400 })
  }

  const weekStartDate = new Date(weekStart + 'T00:00:00.000Z')
  const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [shifts, users, timeOffs, rtts] = await Promise.all([
    prisma.shift.findMany({
      where: {
        user: { companyId: auth.admin.companyId },
        date: { gte: weekStartDate, lt: weekEndDate },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.user.findMany({
      where: { companyId: auth.admin.companyId, active: true, deletedAt: null },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.timeOffRequest.findMany({
      where: {
        user: { companyId: auth.admin.companyId },
        status: 'APPROVED',
        startDate: { lt: weekEndDate },
        endDate: { gte: weekStartDate },
      },
      select: { userId: true, startDate: true, endDate: true, leaveType: true },
    }),
    prisma.rTTRequest.findMany({
      where: {
        user: { companyId: auth.admin.companyId },
        status: 'APPROVED',
        date: { gte: weekStartDate, lt: weekEndDate },
      },
      select: { userId: true, date: true, hoursToRecover: true },
    }),
  ])

  // Compute virtual template shifts from assigned work schedules
  const userIds = users.map(u => u.id)
  const userSchedules = await prisma.userSchedule.findMany({
    where: { userId: { in: userIds }, scheduleId: { not: null } },
    include: { workSchedule: true },
  })

  const realShiftKeys = new Set(shifts.map(s => `${s.userId}__${utcDateKey(new Date(s.date))}`))

  const timeOffKeys = new Set<string>()
  for (const t of timeOffs) {
    const start = new Date(t.startDate)
    const end = new Date(t.endDate)
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStartDate.getTime() + i * 24 * 60 * 60 * 1000)
      if (day >= start && day <= end) timeOffKeys.add(`${t.userId}__${utcDateKey(day)}`)
    }
  }

  const templateShifts = []
  for (const us of userSchedules) {
    if (!us.workSchedule?.startTime || !us.workSchedule.endTime) continue
    let daysOfWeek: number[]
    try { daysOfWeek = JSON.parse(us.workSchedule.daysOfWeek) } catch { continue }
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStartDate.getTime() + i * 24 * 60 * 60 * 1000)
      const isoDay = day.getUTCDay() === 0 ? 7 : day.getUTCDay()
      if (!daysOfWeek.includes(isoDay)) continue
      const dk = utcDateKey(day)
      const key = `${us.userId}__${dk}`
      if (realShiftKeys.has(key) || timeOffKeys.has(key)) continue
      templateShifts.push({
        id: `template_${us.userId}_${dk}`,
        userId: us.userId,
        date: day.toISOString(),
        startTime: us.workSchedule.startTime,
        endTime: us.workSchedule.endTime,
        note: null,
        isTemplate: true,
      })
    }
  }

  return NextResponse.json({ shifts: [...shifts, ...templateShifts], users, timeOffs, rtts })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { userId, siteId, date, startTime, endTime, shiftType, note } = await req.json()
  if (!userId || !date || !startTime || !endTime) {
    return NextResponse.json({ error: 'Champs requis: userId, date, startTime, endTime' }, { status: 400 })
  }
  if (!await canAccessUser(auth.admin.companyId, userId)) return forbiddenError()

  const shift = await prisma.shift.create({
    data: {
      userId,
      siteId: siteId ?? null,
      date: new Date(date + 'T00:00:00.000Z'),
      startTime,
      endTime,
      shiftType: shiftType ?? 'DAY',
      note: note ?? null,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: 'admin_create',
      resource: 'shift',
      resourceId: shift.id,
      changes: JSON.stringify({ userId, date, startTime, endTime }),
    },
  })

  return NextResponse.json({ shift }, { status: 201 })
}
