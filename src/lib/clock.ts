import { prisma } from '@/lib/prisma'

export const OVERTIME_GRACE_MINUTES = 30

// Les horaires de travail (WorkSchedule.startTime/endTime) sont toujours exprimés
// en heure de Bruxelles. Le serveur, lui, tourne en UTC — un simple setHours() les
// interpréterait donc dans le mauvais fuseau (décalage de 1h ou 2h selon été/hiver).
const WORK_TIMEZONE = 'Europe/Brussels'

// Convertit un "HH:MM" d'horaire (heure de Bruxelles) en instant UTC réel, pour le
// jour calendaire de référence (lui aussi compté à Bruxelles). Gère automatiquement
// le passage heure d'été / heure d'hiver, quel que soit le fuseau du serveur.
export function parseShiftTime(timeStr: string, referenceDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: WORK_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(referenceDate)
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')

  // Devine un instant en le lisant comme UTC, puis corrige avec le décalage réel
  // de Bruxelles à cet instant (ce décalage dépend de la date, d'où l'aller-retour).
  const guess = new Date(`${dateStr}T${hh}:${mm}:00Z`)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: WORK_TIMEZONE, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const parts: Record<string, string> = {}
  for (const p of dtf.formatToParts(guess)) parts[p.type] = p.value
  const asIfUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return new Date(guess.getTime() - (asIfUtc - guess.getTime()))
}

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

  const shiftStart = parseShiftTime(startTimeStr, actualArrival)
  let shiftEnd = parseShiftTime(endTimeStr, actualArrival)
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
}) {
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

  const updated = await prisma.clockRecord.update({
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

  return { record: updated, finalDuration, hoursStandard, totalBreakMinutes }
}
