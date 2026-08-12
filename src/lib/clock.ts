import { prisma } from '@/lib/prisma'

export const OVERTIME_GRACE_MINUTES = 30

// Toute heure "métier" (horaires de travail, journée légale, semaine, mois) est
// toujours exprimée en heure de Bruxelles. Le serveur, lui, tourne en UTC — un
// simple setHours()/getDay()/toISOString() l'interpréterait dans le mauvais fuseau
// (décalage de 1h en hiver, 2h en été). Toutes les fonctions ci-dessous convertissent
// explicitement via Europe/Brussels, quel que soit le fuseau du serveur qui les exécute.
const WORK_TIMEZONE = 'Europe/Brussels'

// "YYYY-MM-DD" du jour calendaire à Bruxelles pour un instant donné.
export function brusselsDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WORK_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

export function brusselsDateParts(date: Date): { year: number; month: number; day: number } {
  const [year, month, day] = brusselsDateKey(date).split('-').map(Number)
  return { year, month, day }
}

// Convertit un "HH:MM" d'horaire (heure de Bruxelles) en instant UTC réel, pour le
// jour calendaire de référence (lui aussi compté à Bruxelles). Gère automatiquement
// le passage heure d'été / heure d'hiver, quel que soit le fuseau du serveur.
export function parseShiftTime(timeStr: string, referenceDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const dateStr = brusselsDateKey(referenceDate)
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

// Minuit (00:00 Bruxelles) d'un jour calendaire donné, en instant UTC réel. `day`
// peut sortir de la plage normale (0, -1, 32...) : Date.UTC normalise le débordement
// de mois/année, ce qui permet de faire de l'arithmétique de calendrier en toute sécurité.
function brusselsMidnightUtc(year: number, month1to12: number, day: number): Date {
  const noonUtc = new Date(Date.UTC(year, month1to12 - 1, day, 12))
  return parseShiftTime('00:00', noonUtc)
}

// Bornes [début, fin) de la journée calendaire de Bruxelles contenant referenceDate.
// À utiliser pour tout filtre "aujourd'hui" côté serveur (date: { gte: start, lt: end }).
export function brusselsDayRange(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const { year, month, day } = brusselsDateParts(referenceDate)
  return { start: brusselsMidnightUtc(year, month, day), end: brusselsMidnightUtc(year, month, day + 1) }
}

// Bornes [début, fin) de la semaine ISO (lundi → dimanche inclus) de Bruxelles contenant referenceDate.
export function brusselsWeekRange(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const weekdayStr = new Intl.DateTimeFormat('en-US', { timeZone: WORK_TIMEZONE, weekday: 'short' }).format(referenceDate)
  const isoDay = ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[weekdayStr] ?? 1
  const { year, month, day } = brusselsDateParts(referenceDate)
  return {
    start: brusselsMidnightUtc(year, month, day - (isoDay - 1)),
    end: brusselsMidnightUtc(year, month, day - (isoDay - 1) + 7),
  }
}

// Bornes [début, fin) d'un mois calendaire de Bruxelles (month1to12 peut déborder 1-12,
// normalisé par Date.UTC — pratique pour calculer "le mois précédent" sans cas particulier).
export function brusselsMonthRange(year: number, month1to12: number): { start: Date; end: Date } {
  return { start: brusselsMidnightUtc(year, month1to12, 1), end: brusselsMidnightUtc(year, month1to12 + 1, 1) }
}

// Minuit (Bruxelles) N jours avant/après referenceDate — brique de base pour des
// fenêtres glissantes ("les 7 derniers jours") ancrées sur le calendrier de Bruxelles.
export function brusselsDayOffset(referenceDate: Date, offsetDays: number): Date {
  const { year, month, day } = brusselsDateParts(referenceDate)
  return brusselsMidnightUtc(year, month, day + offsetDays)
}

// Convertit une chaîne "YYYY-MM-DD" (jour calendaire choisi côté client, donc déjà
// en heure de Bruxelles pour un utilisateur belge) en l'instant réel de minuit Bruxelles.
export function brusselsMidnightFromDateString(dateStr: string): Date {
  const noonUtc = new Date(`${dateStr}T12:00:00Z`)
  return parseShiftTime('00:00', noonUtc)
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
