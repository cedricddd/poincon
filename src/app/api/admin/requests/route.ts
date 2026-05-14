import { prisma } from '@/lib/prisma'
import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminWithCompany()
    if (!auth) {
      return forbiddenError()
    }

    // Get all detected overtimes for this company
    const overtimes = await prisma.detectedOvertime.findMany({
      where: {
        user: { companyId: auth.admin.companyId },
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
      orderBy: { createdAt: 'desc' },
    })

    // Get all time off requests for this company
    const timeOffs = await prisma.timeOffRequest.findMany({
      where: {
        user: { companyId: auth.admin.companyId },
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
      orderBy: { createdAt: 'desc' },
    })

    // Get all RTT requests for this company
    const rtts = await prisma.rTTRequest.findMany({
      where: {
        user: { companyId: auth.admin.companyId },
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
