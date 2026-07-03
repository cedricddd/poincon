import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const [
      user, clockRecords, timeOffRequests, rttRequests, detectedOvertimes,
      shifts, userSchedule, userConsents, notifications, teamMemberships,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          active: true,
          managerId: true,
          defaultSiteId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.clockRecord.findMany({
        where: { userId },
        include: { breaks: true },
        orderBy: { date: 'asc' },
      }),
      prisma.timeOffRequest.findMany({
        where: { userId },
        orderBy: { startDate: 'asc' },
      }),
      prisma.rTTRequest.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
      prisma.detectedOvertime.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
      prisma.shift.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
      prisma.userSchedule.findUnique({
        where: { userId },
        include: { workSchedule: true },
      }),
      prisma.userConsent.findUnique({
        where: { userId },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.teamMember.findMany({
        where: { userId },
        include: { team: { select: { name: true } } },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const exportDate = new Date().toISOString().slice(0, 10)

    const payload = {
      profile: user,
      clockRecords,
      timeOffRequests,
      rttRequests,
      detectedOvertimes,
      shifts,
      userSchedule,
      userConsents,
      notifications,
      teamMemberships,
      exportedAt: new Date().toISOString(),
    }

    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="pointon-export-${exportDate}.json"`,
      },
    })
  } catch (error) {
    console.error('RGPD export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
