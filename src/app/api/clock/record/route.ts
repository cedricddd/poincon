import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { dispatchWebhookSafe } from '@/lib/webhook'
import { closeClockRecord, brusselsDayRange } from '@/lib/clock'
import { NextRequest, NextResponse } from 'next/server'

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

    // SECURITY: Prevent multiple clock-in on same day (jour calendaire de Bruxelles)
    const { start: today, end: tomorrow } = brusselsDayRange()

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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })

    // SECURITY: Reject siteId that doesn't belong to the user's own company (cross-tenant IDOR)
    if (siteId) {
      const site = await prisma.site.findFirst({ where: { id: siteId, companyId: user?.companyId ?? undefined }, select: { id: true } })
      if (!site) {
        return NextResponse.json({ error: 'Invalid site' }, { status: 400 })
      }
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
    if (user?.companyId) {
      await prisma.company.update({
        where: { id: user.companyId },
        data: { lastActivityAt: new Date() },
      })
      dispatchWebhookSafe(user.companyId, 'clockrecord.created', {
        clockRecordId: record.id, userId: record.userId, arrivalTime: record.arrivalTime, location: record.location,
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

    // Auto-close any open break, apply shift-snapping + break subtraction, and
    // flag detected overtime if applicable — shared with the QR/kiosk clock-out paths.
    const { record } = await closeClockRecord({
      userId: session.user.id,
      record: existingRecord,
      departureTime: validatedDeparture,
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
      dispatchWebhookSafe(user.companyId, 'clockrecord.departed', {
        clockRecordId: record.id, userId: record.userId, departureTime: record.departureTime, duration: record.duration,
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

    const { start: today, end: tomorrow } = brusselsDayRange()

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
