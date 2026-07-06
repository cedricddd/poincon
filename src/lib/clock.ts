import { prisma } from '@/lib/prisma'

export const OVERTIME_GRACE_MINUTES = 30

export function computeShiftDuration(
  actualArrival: Date,
  actualDeparture: Date,
  startTimeStr: string | null | undefined,
  endTimeStr: string | null | undefined,
  hoursPerDay: number
): { duration: number; hoursWorked: number; hoursStandard: number } {
  if (!startTimeStr || !endTimeStr) {
    const duration = Math.round((actualDeparture.getTime() - actualArrival.getTime()) / 60000)
    return { duration, hoursWorked: duration / 60, hoursStandard: hoursPerDay }
  }

  const parseTime = (timeStr: string, ref: Date) => {
    const [h, m] = timeStr.split(':').map(Number)
    const d = new Date(ref)
    d.setHours(h, m, 0, 0)
    return d
  }

  const shiftStart = parseTime(startTimeStr, actualArrival)
  let shiftEnd = parseTime(endTimeStr, actualArrival)
  if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1)

  const effectiveArrival = actualArrival < shiftStart ? shiftStart : actualArrival
  const graceEnd = new Date(shiftEnd.getTime() + OVERTIME_GRACE_MINUTES * 60000)
  // Only snap to shiftEnd if departure is AT or after shiftEnd (within grace).
  // Early departures use actual time — grace must not be applied before shiftEnd.
  const effectiveDeparture = actualDeparture >= shiftEnd && actualDeparture <= graceEnd
    ? shiftEnd
    : actualDeparture

  const duration = Math.round((effectiveDeparture.getTime() - effectiveArrival.getTime()) / 60000)
  const hoursStandard = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 60000) / 60

  return { duration, hoursWorked: duration / 60, hoursStandard }
}

export async function closeClockRecord({
  userId,
  record,
  departureTime,
}: {
  userId: string
  record: { id: string; arrivalTime: Date; date: Date }
  departureTime: Date
}): Promise<{ finalDuration: number; hoursStandard: number; totalBreakMinutes: number }> {
  const userSchedule = await prisma.userSchedule.findUnique({
    where: { userId },
    include: { workSchedule: true },
  })
  const hoursPerDay = userSchedule?.hoursPerDay ?? 8
  const { duration: computedDuration, hoursStandard } = computeShiftDuration(
    record.arrivalTime,
    departureTime,
    userSchedule?.workSchedule?.startTime,
    userSchedule?.workSchedule?.endTime,
    hoursPerDay
  )

  const openBreak = await prisma.breakEntry.findFirst({
    where: { clockRecordId: record.id, endedAt: null },
  })
  if (openBreak) {
    await prisma.breakEntry.update({ where: { id: openBreak.id }, data: { endedAt: departureTime } })
  }

  const allBreaks = await prisma.breakEntry.findMany({
    where: { clockRecordId: record.id, endedAt: { not: null } },
    select: { startedAt: true, endedAt: true },
  })
  const totalBreakMinutes = allBreaks.reduce((sum, b) => {
    return sum + Math.round((b.endedAt!.getTime() - b.startedAt.getTime()) / 60000)
  }, 0)

  const finalDuration = Math.max(1, computedDuration - totalBreakMinutes)

  await prisma.clockRecord.update({
    where: { id: record.id },
    data: { departureTime, duration: finalDuration },
  })

  if (finalDuration / 60 > hoursStandard) {
    await prisma.detectedOvertime.create({
      data: {
        userId,
        date: record.date,
        hoursWorked: finalDuration / 60,
        hoursStandard,
        overtimeHours: finalDuration / 60 - hoursStandard,
        status: 'PENDING',
      },
    })
  }

  return { finalDuration, hoursStandard, totalBreakMinutes }
}
