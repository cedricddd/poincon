import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { BALANCE_NEUTRAL_LEAVE_TYPES, type LeaveType } from '@/lib/leaveTypes'
import { requestLeaveDays } from '@/lib/leave-days'
import { loadWorkDays } from '@/lib/leave-days-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
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

    // Working days only (schedule days, public holidays excluded); a public holiday
    // leave type never counts as leave taken (same rule as the admin user page).
    const workDays = (await loadWorkDays([session.user.id])).get(session.user.id)!
    const totalDaysOff = approvedTimeOffs
      .filter(r => !BALANCE_NEUTRAL_LEAVE_TYPES.includes(r.leaveType as LeaveType))
      .reduce((sum, r) => sum + requestLeaveDays(r, workDays), 0)

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
