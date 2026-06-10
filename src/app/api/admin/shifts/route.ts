import { requireAdminWithCompany, canAccessUser, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'weekStart requis (YYYY-MM-DD)' }, { status: 400 })
  }

  const weekStartDate = new Date(weekStart + 'T00:00:00.000Z')
  const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [shifts, users, timeOffs] = await Promise.all([
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
      select: { userId: true, startDate: true, endDate: true },
    }),
  ])

  return NextResponse.json({ shifts, users, timeOffs })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { userId, siteId, date, startTime, endTime, note } = await req.json()
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
