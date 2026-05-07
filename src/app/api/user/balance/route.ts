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

    // Get approved detected overtime hours
    const approvedOvertimes = await prisma.detectedOvertime.findMany({
      where: {
        userId: session.user.id,
        status: 'APPROVED',
      },
    })

    const totalOvertimeHours = approvedOvertimes.reduce((sum: number, item) => sum + item.overtimeHours, 0)

    // Get approved RTT hours
    const approvedRTTs = await prisma.rTTRequest.findMany({
      where: {
        userId: session.user.id,
        status: 'APPROVED',
      },
    })

    const totalRTTHours = approvedRTTs.reduce((sum: number, item) => sum + item.hoursToRecover, 0)

    // Get approved time off requests and count days
    const approvedTimeOffs = await prisma.timeOffRequest.findMany({
      where: {
        userId: session.user.id,
        status: 'APPROVED',
      },
    })

    let totalDaysOff = 0
    approvedTimeOffs.forEach(request => {
      const start = new Date(request.startDate)
      const end = new Date(request.endDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      totalDaysOff += days
    })

    // Get pending requests
    const pendingTimeOff = await prisma.timeOffRequest.count({
      where: {
        userId: session.user.id,
        status: 'PENDING',
      },
    })

    const pendingOvertimes = await prisma.detectedOvertime.count({
      where: {
        userId: session.user.id,
        status: 'PENDING',
      },
    })

    const pendingRTTs = await prisma.rTTRequest.count({
      where: {
        userId: session.user.id,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      overtimeHours: totalOvertimeHours,
      rttHours: totalRTTHours,
      daysOff: totalDaysOff,
      balance: totalOvertimeHours - totalRTTHours - (totalDaysOff * 8),
      pendingRequests: {
        timeOff: pendingTimeOff,
        overtime: pendingOvertimes,
        rtt: pendingRTTs,
      },
      approvedOvertimes: approvedOvertimes.length,
      approvedRTTs: approvedRTTs.length,
      approvedTimeOffs: approvedTimeOffs.length,
    })
  } catch (error) {
    console.error('Balance calculation error:', error)
    return NextResponse.json({ error: 'Failed to calculate balance' }, { status: 500 })
  }
}
