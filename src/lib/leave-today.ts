import { prisma } from '@/lib/prisma'
import { brusselsDateKey } from '@/lib/clock'

// Leave dates are stored as midnight UTC of the calendar day, end date inclusive.
// The day an employee is in is the Brussels calendar day, mapped onto that convention.
export function leaveDayKey(now: Date): Date {
  return new Date(`${brusselsDateKey(now)}T00:00:00Z`)
}

export async function findApprovedLeaveOn(userId: string, now: Date = new Date()) {
  const day = leaveDayKey(now)
  return prisma.timeOffRequest.findFirst({
    where: { userId, status: 'APPROVED', startDate: { lte: day }, endDate: { gte: day } },
    select: { leaveType: true, startDate: true, endDate: true },
    orderBy: { endDate: 'desc' },
  })
}
