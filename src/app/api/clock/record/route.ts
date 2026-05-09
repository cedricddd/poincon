import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { arrivalTime, location, siteId } = await req.json()
    if (!arrivalTime) {
      return NextResponse.json({ error: 'Missing arrivalTime' }, { status: 400 })
    }

    const record = await prisma.clockRecord.create({
      data: {
        userId: session.user.id,
        arrivalTime: new Date(arrivalTime),
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recordId, departureTime, duration } = await req.json()
    if (!recordId || !departureTime) {
      return NextResponse.json({ error: 'Missing recordId or departureTime' }, { status: 400 })
    }

    // Update the clock record
    const record = await prisma.clockRecord.update({
      where: { id: recordId },
      data: {
        departureTime: new Date(departureTime),
        duration: Math.round(duration * 60), // Store duration in minutes
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

    // Get user's standard hours
    const userSchedule = await prisma.userSchedule.findUnique({
      where: { userId: session.user.id },
    })

    const hoursStandard = userSchedule?.hoursPerDay || 8 // Default to 8 hours
    const hoursWorked = record.duration! / 60 // Convert minutes to hours

    // If worked more than standard, create DetectedOvertime
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
    const session = await getServerSession(authOptions)
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
