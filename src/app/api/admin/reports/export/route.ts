import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getUserPlan, planCanAccess, planCsvExportMaxDays } from '@/lib/plan'
import { brusselsDateKey, brusselsDayOffset, brusselsMidnightFromDateString } from '@/lib/clock'
import { NextRequest, NextResponse } from 'next/server'


async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return isAdminRole(user?.role) ? session : null
}

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

function fmtDate(iso: Date) {
  return iso.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Brussels' }).replace(/\//g, '-')
}

function fmtTime(iso: Date) {
  return iso.toLocaleTimeString('fr-BE', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Brussels' })
}

// Brussels-local YYYY-MM-DD — safe grouping key for real event timestamps (never use toISOString() here, see commit 32e2016)
function dayKey(iso: Date) {
  return iso.toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' })
}

const LEAVE_TAGS: Record<string, string> = {
  ANNUAL: 'Congé',
  SICK: 'Maladie',
  MATERNITY: 'Maternité',
  ECONOMIC_UNEMPLOYMENT: 'Chômage économique',
}

const EDIT_REASON_LABELS: Record<string, string> = {
  forgot_clockin: 'Oubli de pointage (entrée)',
  forgot_clockout: 'Oubli de pointage (sortie)',
  correction: 'Correction',
  employee_request: 'Demande de l\'employé',
  manual_create: 'Encodage manuel',
  other: 'Autre',
}

interface DayAggregate {
  firstArrival: Date | null
  lastDeparture: Date | null
  hasOpenRecord: boolean
  totalDuration: number
  pauseMinutes: number
  locations: Set<string>
  sites: Set<string>
  tag: string
  editors: Set<string>
  editNotes: string[]
}

function emptyAggregate(): DayAggregate {
  return { firstArrival: null, lastDeparture: null, hasOpenRecord: false, totalDuration: 0, pauseMinutes: 0, locations: new Set(), sites: new Set(), tag: '', editors: new Set(), editNotes: [] }
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  const canFilter = planCanAccess(plan, 'advanced_reports')
  const maxDays = planCsvExportMaxDays(plan)

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })
  if (!adminUser?.companyId) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const userId = canFilter ? (searchParams.get('userId') || undefined) : undefined
  const siteId = canFilter ? (searchParams.get('siteId') || undefined) : undefined
  const from = canFilter ? searchParams.get('from') : null
  const to = canFilter ? searchParams.get('to') : null

  // Enforce max date range for FREE plan (30 days)
  if (maxDays !== -1 && from && to) {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays > maxDays) {
      return NextResponse.json(
        { error: `Le plan ${plan} limite les exports à ${maxDays} jours maximum. Passez à STARTER ou supérieur pour exporter sans limite.` },
        { status: 403 }
      )
    }
  }

  // La grille jour-par-jour doit rester bornée — 30 jours par défaut si aucune plage n'est précisée
  const today = brusselsDateKey(new Date())
  const defaultFrom = brusselsDateKey(brusselsDayOffset(new Date(), -30))
  const effectiveFrom = from ?? defaultFrom
  const effectiveTo = to ?? today

  const companyUsers = await prisma.user.findMany({
    where: {
      companyId: adminUser.companyId,
      deletedAt: null,
      ...(userId ? { id: userId } : {}),
    },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  })
  if (companyUsers.length === 0) {
    return new NextResponse('﻿', { headers: { 'Content-Type': 'text/csv; charset=utf-8' } })
  }
  const allowedIds = companyUsers.map(u => u.id)

  const rangeStart = brusselsMidnightFromDateString(effectiveFrom)
  const rangeEndExclusive = brusselsDayOffset(brusselsMidnightFromDateString(effectiveTo), 1)
  const rangeEnd = new Date(rangeEndExclusive.getTime() - 1) // borne inclusive, pour le clamp des congés plus bas

  const [clockRecords, timeOffRequests] = await Promise.all([
    prisma.clockRecord.findMany({
      where: {
        userId: { in: allowedIds },
        date: { gte: rangeStart, lt: rangeEndExclusive },
        ...(siteId ? { siteId } : {}),
      },
      include: {
        site: { select: { name: true } },
        breaks: { where: { endedAt: { not: null } }, select: { startedAt: true, endedAt: true } },
        editor: { select: { name: true, email: true } },
      },
    }),
    prisma.timeOffRequest.findMany({
      where: {
        status: 'APPROVED',
        userId: { in: allowedIds },
        startDate: { lt: rangeEndExclusive },
        endDate: { gte: rangeStart },
      },
      select: { userId: true, startDate: true, endDate: true, leaveType: true },
    }),
  ])

  // userId -> dayKey -> aggregate
  const grid = new Map<string, Map<string, DayAggregate>>()
  const getCell = (uid: string, key: string): DayAggregate => {
    if (!grid.has(uid)) grid.set(uid, new Map())
    const userGrid = grid.get(uid)!
    if (!userGrid.has(key)) userGrid.set(key, emptyAggregate())
    return userGrid.get(key)!
  }

  for (const r of clockRecords) {
    const cell = getCell(r.userId, dayKey(r.date))
    if (!cell.firstArrival || r.arrivalTime < cell.firstArrival) cell.firstArrival = r.arrivalTime
    if (r.departureTime) {
      if (!cell.lastDeparture || r.departureTime > cell.lastDeparture) cell.lastDeparture = r.departureTime
    } else {
      cell.hasOpenRecord = true
    }
    if (r.duration != null) cell.totalDuration += r.duration
    cell.pauseMinutes += r.breaks.reduce((sum, b) => sum + Math.round((b.endedAt!.getTime() - b.startedAt.getTime()) / 60000), 0)
    cell.locations.add(r.location)
    if (r.site?.name) cell.sites.add(r.site.name)
    if (r.editedAt) {
      cell.editors.add(r.editor?.name ?? r.editor?.email ?? 'Administrateur')
      const label = EDIT_REASON_LABELS[r.editReason ?? ''] ?? r.editReason ?? 'Correction'
      cell.editNotes.push(r.editNote ? `${label} : ${r.editNote}` : label)
    }
  }

  for (const tor of timeOffRequests) {
    const tag = LEAVE_TAGS[tor.leaveType] ?? tor.leaveType
    const clampStart = tor.startDate < rangeStart ? rangeStart : tor.startDate
    const clampEnd = tor.endDate > rangeEnd ? rangeEnd : tor.endDate
    const cur = new Date(clampStart)
    cur.setUTCHours(12, 0, 0, 0) // midi UTC : marge de sécurité contre tout décalage de fuseau lors de l'itération
    const endBound = new Date(clampEnd)
    endBound.setUTCHours(12, 0, 0, 0)
    while (cur <= endBound) {
      getCell(tor.userId, dayKey(cur)).tag = tag
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }

  const header = ['Employé', 'Email', 'Date', 'Arrivée', 'Départ', 'Pause (min)', 'Durée', 'Lieu', 'Site', 'Tag', 'Corrigé par', 'Motif / remarque']
  const rows: string[][] = []

  for (const user of companyUsers) {
    const userGrid = grid.get(user.id)
    const cur = new Date(rangeStart)
    cur.setUTCHours(12, 0, 0, 0)
    const endBound = new Date(rangeEnd)
    endBound.setUTCHours(12, 0, 0, 0)
    while (cur <= endBound) {
      const key = dayKey(cur)
      const cell = userGrid?.get(key)
      rows.push([
        user.name ?? '',
        user.email,
        fmtDate(cur),
        cell?.firstArrival ? fmtTime(cell.firstArrival) : '',
        cell?.lastDeparture ? fmtTime(cell.lastDeparture) : (cell?.hasOpenRecord ? 'Non pointé' : ''),
        cell?.firstArrival ? String(cell.pauseMinutes) : '',
        cell && (cell.totalDuration > 0 || cell.lastDeparture) ? fmt(cell.totalDuration) : '',
        cell ? [...cell.locations].join(', ') : '',
        cell ? [...cell.sites].join(', ') : '',
        cell?.tag ?? '',
        cell ? [...cell.editors].join(', ') : '',
        cell ? cell.editNotes.join(' | ') : '',
      ])
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }

  const safeCell = (v: string) => {
    const s = String(v)
    return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  }
  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${safeCell(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')

  const filename = `pointages_${from ?? 'all'}_${to ?? 'all'}.csv`

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
