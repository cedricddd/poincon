import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getUserPlan, planCanAccess, planCsvExportMaxDays } from '@/lib/plan'
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

const LEAVE_TAGS: Record<string, string> = {
  ANNUAL: 'Congé',
  SICK: 'Maladie',
  MATERNITY: 'Maternité',
  ECONOMIC_UNEMPLOYMENT: 'Chômage économique',
}

interface ExportRow { userId: string; date: Date; cells: string[] }

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

  // FREE without filter: cap to last 30 days automatically
  const effectiveFrom = maxDays !== -1 && !from
    ? new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : from

  const where = {
    user: { companyId: adminUser.companyId },
    ...(userId ? { userId } : {}),
    ...(siteId ? { siteId } : {}),
    ...((effectiveFrom || to) ? {
      date: {
        ...(effectiveFrom ? { gte: new Date(effectiveFrom) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
      },
    } : {}),
  }

  const records = await prisma.clockRecord.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      site: { select: { name: true } },
      breaks: { where: { endedAt: { not: null } }, select: { startedAt: true, endedAt: true } },
    },
    orderBy: [{ userId: 'asc' }, { date: 'desc' }],
  })

  const header = ['Employé', 'Email', 'Date', 'Arrivée', 'Départ', 'Pause (min)', 'Durée', 'Lieu', 'Site', 'Tag']

  const workedRows: ExportRow[] = records.map(r => {
    const pauseMinutes = r.breaks.reduce((sum, b) => sum + Math.round((b.endedAt!.getTime() - b.startedAt.getTime()) / 60000), 0)
    return {
      userId: r.userId,
      date: r.date,
      cells: [
        r.user.name ?? '',
        r.user.email,
        fmtDate(r.date),
        fmtTime(r.arrivalTime),
        r.departureTime ? fmtTime(r.departureTime) : 'Non pointé',
        String(pauseMinutes),
        r.duration != null ? fmt(r.duration) : '',
        r.location,
        r.site?.name ?? '',
        '',
      ],
    }
  })

  // Fusion des absences approuvées chevauchant la plage — skip si filtre par site (les absences n'ont pas de site)
  const absenceRows: ExportRow[] = []
  if (!siteId) {
    const rangeFromDate = effectiveFrom ? new Date(effectiveFrom) : null
    const rangeToDate = to ? new Date(to + 'T23:59:59') : null

    const timeOffRequests = await prisma.timeOffRequest.findMany({
      where: {
        status: 'APPROVED',
        user: { companyId: adminUser.companyId },
        ...(userId ? { userId } : {}),
        ...(rangeFromDate ? { endDate: { gte: rangeFromDate } } : {}),
        ...(rangeToDate ? { startDate: { lte: rangeToDate } } : {}),
      },
      include: { user: { select: { name: true, email: true } } },
    })

    for (const tor of timeOffRequests) {
      const clampStart = rangeFromDate && rangeFromDate > tor.startDate ? rangeFromDate : tor.startDate
      const clampEnd = rangeToDate && rangeToDate < tor.endDate ? rangeToDate : tor.endDate
      const tag = LEAVE_TAGS[tor.leaveType] ?? tor.leaveType

      const cur = new Date(clampStart)
      cur.setHours(0, 0, 0, 0)
      const endBound = new Date(clampEnd)
      endBound.setHours(0, 0, 0, 0)
      while (cur <= endBound) {
        const dow = cur.getDay()
        if (dow >= 1 && dow <= 5) {
          absenceRows.push({
            userId: tor.userId,
            date: new Date(cur),
            cells: [tor.user.name ?? '', tor.user.email, fmtDate(cur), '', '', '', '', '', '', tag],
          })
        }
        cur.setDate(cur.getDate() + 1)
      }
    }
  }

  const rows = [...workedRows, ...absenceRows]
    .sort((a, b) => (a.userId !== b.userId ? (a.userId < b.userId ? -1 : 1) : b.date.getTime() - a.date.getTime()))
    .map(r => r.cells)

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
