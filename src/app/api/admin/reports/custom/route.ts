import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return isAdminRole(user?.role) ? session : null
}

async function getCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
  if (user?.companyId) return user.companyId
  const company = await prisma.company.findFirst({ where: { adminId: userId }, select: { id: true } })
  return company?.id ?? null
}

function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-S${String(week).padStart(2, '0')}`
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const from   = searchParams.get('from')
  const to     = searchParams.get('to')
  const teamId = searchParams.get('teamId')
  const groupBy = (searchParams.get('groupBy') ?? 'employee') as 'employee' | 'team' | 'week' | 'month'

  if (!from || !to) return NextResponse.json({ error: 'from et to requis' }, { status: 400 })

  const companyUsers = await prisma.user.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(teamId && { teamMemberships: { some: { teamId } } }),
    },
    select: { id: true, name: true, email: true },
  })
  const allowedIds = companyUsers.map(u => u.id)
  if (allowedIds.length === 0) {
    const teams = await prisma.team.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    return NextResponse.json({ rows: [], teams, employees: [] })
  }

  // Actual clock records (completed punches)
  const records = await prisma.clockRecord.findMany({
    where: {
      userId: { in: allowedIds },
      date: { gte: new Date(from), lte: new Date(to + 'T23:59:59Z') },
      departureTime: { not: null },
      duration: { not: null },
    },
    select: { userId: true, date: true, duration: true },
  })

  const timeOffs = await prisma.timeOffRequest.findMany({
    where: {
      userId: { in: allowedIds },
      status: 'APPROVED',
      startDate: { lte: new Date(to + 'T23:59:59Z') },
      endDate:   { gte: new Date(from) },
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

  type Row = { key: string; label: string; recordCount: number; totalHours: number; timeOffDays: number }
  const rowMap = new Map<string, Row>()

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
    let cur = new Date(effectiveStart)
    while (cur <= effectiveEnd) {
      const key = getKey(toff.userId, cur)
      if (!rowMap.has(key)) {
        rowMap.set(key, { key, label: getLabel(key, toff.userId), recordCount: 0, totalHours: 0, timeOffDays: 0 })
      }
      rowMap.get(key)!.timeOffDays++
      cur.setDate(cur.getDate() + 1)
    }
  }

  const rows = Array.from(rowMap.values()).sort((a, b) => a.label.localeCompare(b.label))
  const teams = await prisma.team.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  const employees = companyUsers.map(u => ({ id: u.id, name: u.name ?? u.email }))

  return NextResponse.json({ rows, teams, employees })
}
