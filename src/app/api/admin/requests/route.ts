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

    // Get all detected overtimes with user info
    const overtimes = await prisma.detectedOvertime.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get all time off requests with user info
    const timeOffs = await prisma.timeOffRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get all RTT requests with user info
    const rtts = await prisma.rTTRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const statusOrder = (s: string) => (s === 'PENDING' ? 0 : 1)

    const sort = <T extends { status: string; createdAt?: Date }>(arr: T[]) =>
      [...arr].sort((a, b) => statusOrder(a.status) - statusOrder(b.status))

    return NextResponse.json({
      overtimes: sort(overtimes).map(ot => ({
        id: ot.id,
        userId: ot.userId,
        date: ot.date.toISOString(),
        hoursWorked: ot.hoursWorked,
        hoursStandard: ot.hoursStandard,
        overtimeHours: ot.overtimeHours,
        status: ot.status,
        userName: ot.user.name || 'Sans nom',
        userEmail: ot.user.email,
      })),
      timeOffs: sort(timeOffs).map(to => ({
        id: to.id,
        userId: to.userId,
        startDate: to.startDate.toISOString(),
        endDate: to.endDate.toISOString(),
        reason: to.reason,
        status: to.status,
        userName: to.user.name || 'Sans nom',
        userEmail: to.user.email,
      })),
      rtts: sort(rtts).map(rtt => ({
        id: rtt.id,
        userId: rtt.userId,
        date: rtt.date.toISOString(),
        hoursToRecover: rtt.hoursToRecover,
        reason: rtt.reason,
        status: rtt.status,
        userName: rtt.user.name || 'Sans nom',
        userEmail: rtt.user.email,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
