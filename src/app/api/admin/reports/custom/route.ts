import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { companyHasAddon } from '@/lib/plan'
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

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  if (!await companyHasAddon(companyId, 'addon_custom_reports')) {
    return NextResponse.json({ error: 'Add-on Rapports custom requis' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from    = searchParams.get('from')
  const to      = searchParams.get('to')
  const userIds = searchParams.getAll('userId')
  const teamId  = searchParams.get('teamId')
  const shiftType = searchParams.get('shiftType')
  const groupBy = (searchParams.get('groupBy') ?? 'employee') as 'employee' | 'team' | 'week' | 'month'

  if (!from || !to) return NextResponse.json({ error: 'from et to requis' }, { status: 400 })

  // Resolve employee IDs in company
  const companyUsers = await prisma.user.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(userIds.length > 0 && { id: { in: userIds } }),
      ...(teamId && { teamMemberships: { some: { teamId } } }),
    },
    select: { id: true, name: true, email: true },
  })
  const allowedIds = companyUsers.map(u => u.id)
  if (allowedIds.length === 0) return NextResponse.json({ rows: [], meta: { groupBy, from, to } })

  const shifts = await prisma.shift.findMany({
    where: {
      userId: { in: allowedIds },
      date: { gte: new Date(from), lte: new Date(to + 'T23:59:59Z') },
      ...(shiftType && { shiftType }),
    },
    select: {
      id: true, userId: true, date: true, startTime: true, endTime: true, shiftType: true,
    },
  })

  const timeOffs = await prisma.timeOffRequest.findMany({
    where: {
      userId: { in: allowedIds },
      status: 'APPROVED',
      startDate: { lte: new Date(to + 'T23:59:59Z') },
      endDate:   { gte: new Date(from) },
    },
    select: { userId: true, startDate: true, endDate: true, leaveType: true },
  })

  // Helper: compute shift duration in hours
  function shiftHours(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let h = (eh * 60 + em) - (sh * 60 + sm)
    if (h < 0) h += 24 * 60
    return Math.round((h / 60) * 100) / 100
  }

  // Helper: iso week key
  function weekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
  }

  function monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const userMap = Object.fromEntries(companyUsers.map(u => [u.id, u]))

  // Team membership for groupBy team
  let teamMap: Record<string, string> = {}
  if (groupBy === 'team') {
    const memberships = await prisma.teamMember.findMany({
      where: { userId: { in: allowedIds } },
      include: { team: { select: { name: true } } },
    })
    teamMap = Object.fromEntries(memberships.map(m => [m.userId, m.team.name]))
  }

  type Row = { key: string; label: string; shiftCount: number; totalHours: number; timeOffDays: number; shiftTypes: Record<string, number> }
  const rowMap = new Map<string, Row>()

  const getKey = (userId: string, date: Date): string => {
    if (groupBy === 'employee') return userId
    if (groupBy === 'team') return teamMap[userId] ?? 'Sans équipe'
    if (groupBy === 'week') return weekKey(date)
    return monthKey(date)
  }

  const getLabel = (key: string, userId: string): string => {
    if (groupBy === 'employee') return userMap[userId]?.name ?? userMap[userId]?.email ?? key
    if (groupBy === 'team') return key
    return key
  }

  for (const shift of shifts) {
    const date = new Date(shift.date)
    const key = getKey(shift.userId, date)
    const label = getLabel(key, shift.userId)
    if (!rowMap.has(key)) rowMap.set(key, { key, label, shiftCount: 0, totalHours: 0, timeOffDays: 0, shiftTypes: {} })
    const row = rowMap.get(key)!
    row.shiftCount++
    row.totalHours += shiftHours(shift.startTime, shift.endTime)
    const st = shift.shiftType ?? 'DAY'
    row.shiftTypes[st] = (row.shiftTypes[st] ?? 0) + 1
  }

  // Count time-off days per group
  for (const to of timeOffs) {
    const start = new Date(to.startDate)
    const end = new Date(to.endDate)
    const fromD = new Date(from)
    const toD = new Date(to + 'T23:59:59Z')
    const effectiveStart = start < fromD ? fromD : start
    const effectiveEnd = end > toD ? toD : end
    let cur = new Date(effectiveStart)
    while (cur <= effectiveEnd) {
      const key = getKey(to.userId, cur)
      if (!rowMap.has(key)) {
        const label = getLabel(key, to.userId)
        rowMap.set(key, { key, label, shiftCount: 0, totalHours: 0, timeOffDays: 0, shiftTypes: {} })
      }
      rowMap.get(key)!.timeOffDays++
      cur.setDate(cur.getDate() + 1)
    }
  }

  const rows = Array.from(rowMap.values()).sort((a, b) => a.label.localeCompare(b.label))

  // Teams list for filter dropdown
  const teams = await prisma.team.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  const employees = companyUsers.map(u => ({ id: u.id, name: u.name ?? u.email }))

  return NextResponse.json({ rows, meta: { groupBy, from, to, shiftType, teamId }, teams, employees })
}
