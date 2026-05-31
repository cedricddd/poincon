import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getUserPlan, planCanAccess } from '@/lib/plan'
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
  return iso.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtTime(iso: Date) {
  return iso.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  const canFilter = planCanAccess(plan, 'advanced_reports')

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

  const where = {
    user: { companyId: adminUser.companyId },
    ...(userId ? { userId } : {}),
    ...(siteId ? { siteId } : {}),
    ...(from || to ? {
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
      },
    } : {}),
  }

  const records = await prisma.clockRecord.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      site: { select: { name: true } },
    },
    orderBy: [{ userId: 'asc' }, { date: 'desc' }],
  })

  const header = ['Employé', 'Email', 'Date', 'Arrivée', 'Départ', 'Durée', 'Lieu', 'Site']
  const rows = records.map(r => [
    r.user.name ?? '',
    r.user.email,
    fmtDate(r.date),
    fmtTime(r.arrivalTime),
    r.departureTime ? fmtTime(r.departureTime) : 'Non pointé',
    r.duration != null ? fmt(r.duration) : '',
    r.location,
    r.site?.name ?? '',
  ])

  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')

  const filename = `pointages_${from ?? 'all'}_${to ?? 'all'}.csv`

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
