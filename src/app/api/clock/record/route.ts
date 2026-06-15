import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

const OVERTIME_GRACE_MINUTES = 30

// SECURITY: Validate timestamp is within reasonable range
function validateTimestamp(timestamp: any): Date | null {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const oneHourInFuture = new Date(now.getTime() + 60 * 60 * 1000)

    // Reject timestamps not in acceptable range (±5min tolerance, +1h future buffer)
    if (date < fiveMinutesAgo || date > oneHourInFuture) {
      return null
    }
    return date
  } catch {
    return null
  }
}

// Parse "HH:MM" string into a Date on the same calendar day as referenceDate
function parseShiftTime(timeStr: string, referenceDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const result = new Date(referenceDate)
  result.setHours(hours, minutes, 0, 0)
  return result
}

// Compute worked duration (minutes) and overtime hours applying shift boundaries.
// Raw timestamps are preserved in DB — only duration is adjusted.
function computeShiftDuration(
  actualArrival: Date,
  actualDeparture: Date,
  startTimeStr: string | null | undefined,
  endTimeStr: string | null | undefined,
  hoursPerDay: number
): { duration: number; hoursWorked: number; hoursStandard: number } {
  // No shift configured → raw calculation
  if (!startTimeStr || !endTimeStr) {
    const duration = Math.round((actualDeparture.getTime() - actualArrival.getTime()) / 60000)
    return { duration, hoursWorked: duration / 60, hoursStandard: hoursPerDay }
  }

  const shiftStart = parseShiftTime(startTimeStr, actualArrival)
  let shiftEnd = parseShiftTime(endTimeStr, actualArrival)

  // Night shift crossing midnight (e.g. 22:00 → 06:00)
  if (shiftEnd <= shiftStart) {
    shiftEnd.setDate(shiftEnd.getDate() + 1)
  }

  // Arrival before shift start → snap to shift start (early presence doesn't count)
  const effectiveArrival = actualArrival < shiftStart ? shiftStart : actualArrival

  // Departure at/after shift end within grace → snap to shift end (no overtime).
  // Early departures use actual time.
  const graceEnd = new Date(shiftEnd.getTime() + OVERTIME_GRACE_MINUTES * 60000)
  const effectiveDeparture = actualDeparture >= shiftEnd && actualDeparture <= graceEnd
    ? shiftEnd
    : actualDeparture

  const duration = Math.round((effectiveDeparture.getTime() - effectiveArrival.getTime()) / 60000)
  const hoursStandard = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 60000) / 60

  return { duration, hoursWorked: duration / 60, hoursStandard }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { arrivalTime, location, siteId } = await req.json()
    if (!arrivalTime) {
      return NextResponse.json({ error: 'Missing arrivalTime' }, { status: 400 })
    }

    // SECURITY: Validate timestamp
    const validatedTime = validateTimestamp(arrivalTime)
    if (!validatedTime) {
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 })
    }

    // SECURITY: Prevent multiple clock-in on same day
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingRecord = await prisma.clockRecord.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
        departureTime: null, // Only check if not already clocked out
      },
    })

    if (existingRecord) {
      return NextResponse.json(
        { error: 'Already clocked in. Clock out first.' },
        { status: 409 }
      )
    }

    const record = await prisma.clockRecord.create({
      data: {
        userId: session.user.id,
        arrivalTime: validatedTime,
        location: location || 'Sur site',
        ...(siteId && { siteId }),
      },
    })

    // Update company's lastActivityAt for super-admin dashboard
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })
    if (user?.companyId) {
      await prisma.company.update({
        where: { id: user.companyId },
        data: { lastActivityAt: new Date() },
      })
    }

    await logAudit({
      userId: session.user.id,
      action: 'clock_in',
      resource: 'clockRecord',
      resourceId: record.id,
      changes: { arrivalTime, location: location || 'Sur site', siteId: siteId ?? null },
      ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Clock POST error:', error)
    return NextResponse.json({ error: 'Failed to create clock record' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recordId, departureTime } = await req.json()
    if (!recordId || !departureTime) {
      return NextResponse.json({ error: 'Missing recordId or departureTime' }, { status: 400 })
    }

    // SECURITY: Verify the record belongs to the current user
    const existingRecord = await prisma.clockRecord.findUnique({
      where: { id: recordId },
    })

    if (!existingRecord || existingRecord.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Record not found or not authorized' },
        { status: 403 }
      )
    }

    // SECURITY: Validate departure timestamp
    const validatedDeparture = validateTimestamp(departureTime)
    if (!validatedDeparture) {
      return NextResponse.json({ error: 'Invalid departure time' }, { status: 400 })
    }

    // SECURITY: Ensure departure is after arrival
    if (validatedDeparture <= existingRecord.arrivalTime) {
      return NextResponse.json(
        { error: 'Departure time must be after arrival time' },
        { status: 400 }
      )
    }

    // SECURITY: Validate raw duration is reasonable (max 16 hours to cover long shifts)
    const rawDurationMinutes = Math.round(
      (validatedDeparture.getTime() - existingRecord.arrivalTime.getTime()) / 60000
    )
    if (rawDurationMinutes < 0 || rawDurationMinutes > 16 * 60) {
      return NextResponse.json(
        { error: 'Invalid duration (must be 0 to 16 hours)' },
        { status: 400 }
      )
    }

    // Fetch user schedule to apply shift-snapping if configured
    const userSchedule = await prisma.userSchedule.findUnique({
      where: { userId: session.user.id },
      include: { workSchedule: true },
    })

    const hoursPerDay = userSchedule?.hoursPerDay ?? 8
    const { duration: computedDuration, hoursStandard } = computeShiftDuration(
      existingRecord.arrivalTime,
      validatedDeparture,
      userSchedule?.workSchedule?.startTime,
      userSchedule?.workSchedule?.endTime,
      hoursPerDay
    )

    // Auto-close any open break at departure time and sum all break minutes
    const openBreak = await prisma.breakEntry.findFirst({
      where: { clockRecordId: recordId, endedAt: null },
    })
    if (openBreak) {
      await prisma.breakEntry.update({ where: { id: openBreak.id }, data: { endedAt: validatedDeparture } })
    }

    const allBreaks = await prisma.breakEntry.findMany({
      where: { clockRecordId: recordId, endedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    })
    const totalBreakMinutes = allBreaks.reduce((sum, b) => {
      return sum + Math.round((b.endedAt!.getTime() - b.startedAt.getTime()) / 60000)
    }, 0)

    const finalDuration = Math.max(1, computedDuration - totalBreakMinutes)
    const hoursWorked = finalDuration / 60

    // Update the clock record with the shift-adjusted, break-subtracted duration
    const record = await prisma.clockRecord.update({
      where: { id: recordId },
      data: {
        departureTime: validatedDeparture, // raw timestamp preserved
        duration: finalDuration,
      },
    })

    // Update company's lastActivityAt for super-admin dashboard
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })
    if (user?.companyId) {
      await prisma.company.update({
        where: { id: user.companyId },
        data: { lastActivityAt: new Date() },
      })
    }

    // Create DetectedOvertime only if hours exceed standard (shift-snapped value)
    if (hoursWorked > hoursStandard) {
      const overtimeHours = hoursWorked - hoursStandard

      await prisma.detectedOvertime.create({
        data: {
          userId: session.user.id,
          date: record.date,
          hoursWorked,
          hoursStandard,
          overtimeHours,
          status: 'PENDING',
        },
      })
    }

    await logAudit({
      userId: session.user.id,
      action: 'clock_out',
      resource: 'clockRecord',
      resourceId: record.id,
      changes: { departureTime, duration: record.duration },
      ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json(record, { status: 200 })
  } catch (error) {
    console.error('Clock PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update clock record' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const records = await prisma.clockRecord.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(records, { status: 200 })
  } catch (error) {
    console.error('Clock GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch clock records' }, { status: 500 })
  }
}
