import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all employees with their schedules
    const schedules = await prisma.userSchedule.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Failed to fetch schedules:', error)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, hoursPerDay } = await req.json()

    if (!userId || hoursPerDay === undefined) {
      return NextResponse.json({ error: 'Missing userId or hoursPerDay' }, { status: 400 })
    }

    if (hoursPerDay <= 0 || hoursPerDay > 24) {
      return NextResponse.json({ error: 'Hours must be between 0 and 24' }, { status: 400 })
    }

    // Update or create schedule
    const schedule = await prisma.userSchedule.upsert({
      where: { userId },
      update: { hoursPerDay },
      create: {
        userId,
        hoursPerDay,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'admin_update_schedule',
        resource: 'UserSchedule',
        resourceId: userId,
        changes: JSON.stringify({ hoursPerDay }),
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Failed to update schedule:', error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}
