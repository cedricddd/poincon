import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { brusselsDayRange } from '@/lib/clock'

// GET — check if meal break is enabled + return active break state
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })
  if (!user?.companyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { mealBreakEnabled: true },
  })

  const enabled = company?.mealBreakEnabled ?? false

  // Find active clock record for today
  const { start: today, end: tomorrow } = brusselsDayRange()

  const activeRecord = await prisma.clockRecord.findFirst({
    where: { userId: session.user.id, departureTime: null, date: { gte: today, lt: tomorrow } },
    select: {
      id: true,
      breaks: { where: { endedAt: null }, select: { id: true, startedAt: true }, take: 1 },
    },
  })

  const activeBreak = activeRecord?.breaks?.[0] ?? null

  // Sum completed breaks today
  const completedBreaks = activeRecord
    ? await prisma.breakEntry.findMany({
        where: { clockRecordId: activeRecord.id, endedAt: { not: null } },
        select: { startedAt: true, endedAt: true },
      })
    : []

  const totalBreakMinutes = completedBreaks.reduce((sum, b) => {
    return sum + Math.round((b.endedAt!.getTime() - b.startedAt.getTime()) / 60000)
  }, 0)

  return NextResponse.json({
    enabled,
    clockRecordId: activeRecord?.id ?? null,
    activeBreak: activeBreak ? { id: activeBreak.id, startedAt: activeBreak.startedAt.toISOString() } : null,
    totalBreakMinutes,
  })
}

// POST — start a meal break
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clockRecordId } = await req.json()
  if (!clockRecordId) return NextResponse.json({ error: 'Missing clockRecordId' }, { status: 400 })

  // Verify ownership
  const record = await prisma.clockRecord.findUnique({ where: { id: clockRecordId } })
  if (!record || record.userId !== session.user.id) {
    return NextResponse.json({ error: 'Record not found or not authorized' }, { status: 403 })
  }
  if (record.departureTime) {
    return NextResponse.json({ error: 'Cannot start break on a closed record' }, { status: 409 })
  }

  // Check feature is enabled
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { companyId: true } })
  const company = user?.companyId
    ? await prisma.company.findUnique({ where: { id: user.companyId }, select: { mealBreakEnabled: true } })
    : null
  if (!company?.mealBreakEnabled) {
    return NextResponse.json({ error: 'Meal break feature not enabled' }, { status: 403 })
  }

  // Prevent duplicate open break
  const existing = await prisma.breakEntry.findFirst({
    where: { clockRecordId, endedAt: null },
  })
  if (existing) return NextResponse.json({ error: 'Break already active' }, { status: 409 })

  const breakEntry = await prisma.breakEntry.create({
    data: { clockRecordId, startedAt: new Date() },
  })

  return NextResponse.json({ id: breakEntry.id, startedAt: breakEntry.startedAt.toISOString() }, { status: 201 })
}

// PATCH — end a meal break
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { breakId } = await req.json()
  if (!breakId) return NextResponse.json({ error: 'Missing breakId' }, { status: 400 })

  const breakEntry = await prisma.breakEntry.findUnique({
    where: { id: breakId },
    include: { clockRecord: { select: { userId: true } } },
  })
  if (!breakEntry || breakEntry.clockRecord.userId !== session.user.id) {
    return NextResponse.json({ error: 'Break not found or not authorized' }, { status: 403 })
  }
  if (breakEntry.endedAt) {
    return NextResponse.json({ error: 'Break already ended' }, { status: 409 })
  }

  const endedAt = new Date()
  const updated = await prisma.breakEntry.update({
    where: { id: breakId },
    data: { endedAt },
  })

  const durationMinutes = Math.round((endedAt.getTime() - breakEntry.startedAt.getTime()) / 60000)

  return NextResponse.json({
    id: updated.id,
    startedAt: updated.startedAt.toISOString(),
    endedAt: updated.endedAt!.toISOString(),
    durationMinutes,
  })
}
