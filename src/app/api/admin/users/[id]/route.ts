import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return isAdminRole(user?.role) ? session : null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      defaultSiteId: true,
      defaultSite: { select: { id: true, name: true } },
      userSchedule: { include: { workSchedule: true } },
      clockRecords: {
        orderBy: { date: 'desc' },
        take: 30,
      },
      timeOffRequests: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, startDate: true, endDate: true, reason: true, status: true, createdAt: true },
      },
      rttRequests: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, date: true, hoursToRecover: true, reason: true, status: true, createdAt: true },
      },
      detectedOvertimes: {
        orderBy: { date: 'desc' },
        take: 20,
        select: { id: true, date: true, hoursWorked: true, hoursStandard: true, overtimeHours: true, status: true },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Compute balance
  const [approvedOT, approvedRTT, approvedTO] = await Promise.all([
    prisma.detectedOvertime.aggregate({
      where: { userId: id, status: 'APPROVED' },
      _sum: { overtimeHours: true },
    }),
    prisma.rTTRequest.aggregate({
      where: { userId: id, status: 'APPROVED' },
      _sum: { hoursToRecover: true },
    }),
    prisma.timeOffRequest.findMany({
      where: { userId: id, status: 'APPROVED' },
      select: { startDate: true, endDate: true },
    }),
  ])

  const overtimeHours = Number(approvedOT._sum.overtimeHours ?? 0)
  const rttHours = Number(approvedRTT._sum.hoursToRecover ?? 0)
  const timeOffDays = approvedTO.reduce((sum, r) => {
    const days = Math.round((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000) + 1
    return sum + days
  }, 0)
  const balance = overtimeHours - rttHours - timeOffDays * 8

  return NextResponse.json({
    user,
    balance: { overtimeHours, rttHours, timeOffDays, balance },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { balanceAdjustment, adjustmentReason, defaultSiteId } = body

  if ('defaultSiteId' in body) {
    await prisma.user.update({
      where: { id },
      data: { defaultSiteId: defaultSiteId ?? null },
    })
    return NextResponse.json({ success: true })
  }

  if (typeof balanceAdjustment !== 'number') {
    return NextResponse.json({ error: 'balanceAdjustment requis (nombre)' }, { status: 400 })
  }

  // Materialise adjustment as a DetectedOvertime record (manual)
  await prisma.detectedOvertime.create({
    data: {
      userId: id,
      date: new Date(),
      hoursWorked: 0,
      hoursStandard: 0,
      overtimeHours: balanceAdjustment,
      status: 'APPROVED',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_balance_adjustment',
      resource: 'DetectedOvertime',
      resourceId: id,
      changes: JSON.stringify({ balanceAdjustment, adjustmentReason }),
    },
  })

  return NextResponse.json({ success: true })
}
