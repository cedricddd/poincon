import { prisma } from '@/lib/prisma'
import { brusselsDateParts, brusselsMidnightFromDateString, brusselsDayOffset } from '@/lib/clock'

export type ReportGroupBy = 'employee' | 'team' | 'week' | 'month'

export interface ReportAnalysisRow {
  key: string
  label: string
  recordCount: number
  totalHours: number
  timeOffDays: number
}

// Regroupe par semaine/mois ISO du calendrier de Bruxelles, pas celui du serveur
// (le conteneur tourne en UTC ; sans ça, un pointage réellement du lundi matin
// bascule encore dans "dimanche" côté serveur pendant la fenêtre de minuit).
function weekKey(date: Date): string {
  const { year, month, day } = brusselsDateParts(date)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-S${String(week).padStart(2, '0')}`
}

function monthKey(date: Date): string {
  const { year, month } = brusselsDateParts(date)
  return `${year}-${String(month).padStart(2, '0')}`
}

export async function runReportAnalysis(params: {
  companyId: string
  from: string
  to: string
  teamId?: string | null
  groupBy?: ReportGroupBy
}): Promise<ReportAnalysisRow[]> {
  const { companyId, from, to, teamId, groupBy = 'employee' } = params

  const companyUsers = await prisma.user.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(teamId && { teamMemberships: { some: { teamId } } }),
    },
    select: { id: true, name: true, email: true },
  })
  const allowedIds = companyUsers.map(u => u.id)
  if (allowedIds.length === 0) return []

  const fromInstant = brusselsMidnightFromDateString(from)
  const toInstantExclusive = brusselsDayOffset(brusselsMidnightFromDateString(to), 1)

  const records = await prisma.clockRecord.findMany({
    where: {
      userId: { in: allowedIds },
      date: { gte: fromInstant, lt: toInstantExclusive },
      departureTime: { not: null },
      duration: { not: null },
    },
    select: { userId: true, date: true, duration: true },
  })

  const timeOffs = await prisma.timeOffRequest.findMany({
    where: {
      userId: { in: allowedIds },
      status: 'APPROVED',
      startDate: { lt: toInstantExclusive },
      endDate: { gte: fromInstant },
    },
    select: { userId: true, startDate: true, endDate: true },
  })

  const userMap = Object.fromEntries(companyUsers.map(u => [u.id, u]))

  let teamMap: Record<string, string> = {}
  if (groupBy === 'team') {
    const memberships = await prisma.teamMember.findMany({
      where: { userId: { in: allowedIds } },
      include: { team: { select: { name: true } } },
    })
    teamMap = Object.fromEntries(memberships.map(m => [m.userId, m.team.name]))
  }

  const rowMap = new Map<string, ReportAnalysisRow>()

  const getKey = (userId: string, date: Date): string => {
    if (groupBy === 'employee') return userId
    if (groupBy === 'team') return teamMap[userId] ?? 'Sans équipe'
    if (groupBy === 'week') return weekKey(date)
    return monthKey(date)
  }

  const getLabel = (key: string, userId: string): string => {
    if (groupBy === 'employee') return userMap[userId]?.name ?? userMap[userId]?.email ?? key
    return key
  }

  for (const record of records) {
    const date = new Date(record.date)
    const key = getKey(record.userId, date)
    const label = getLabel(key, record.userId)
    if (!rowMap.has(key)) rowMap.set(key, { key, label, recordCount: 0, totalHours: 0, timeOffDays: 0 })
    const row = rowMap.get(key)!
    row.recordCount++
    row.totalHours += (record.duration ?? 0) / 60
  }

  for (const toff of timeOffs) {
    const start = new Date(toff.startDate)
    const end = new Date(toff.endDate)
    const fromD = new Date(from)
    const toD = new Date(to + 'T23:59:59Z')
    const effectiveStart = start < fromD ? fromD : start
    const effectiveEnd = end > toD ? toD : end
    const cur = new Date(effectiveStart)
    while (cur <= effectiveEnd) {
      const key = getKey(toff.userId, cur)
      if (!rowMap.has(key)) {
        rowMap.set(key, { key, label: getLabel(key, toff.userId), recordCount: 0, totalHours: 0, timeOffDays: 0 })
      }
      rowMap.get(key)!.timeOffDays++
      cur.setDate(cur.getDate() + 1)
    }
  }

  return Array.from(rowMap.values()).sort((a, b) => a.label.localeCompare(b.label))
}
