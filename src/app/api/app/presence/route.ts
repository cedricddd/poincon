import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getPresenceAccess } from '@/lib/plan'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })
  if (!user?.companyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { hasAccess, presenceForEmployees } = await getPresenceAccess(user.companyId)
  if (!hasAccess) return NextResponse.json({ error: 'Plan insuffisant — fonctionnalité Présences non disponible' }, { status: 403 })
  if (!presenceForEmployees) return NextResponse.json({ error: 'Fonctionnalité désactivée par votre administrateur' }, { status: 403 })

  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const tomorrowUTC = new Date(todayUTC)
  tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)

  const records = await prisma.clockRecord.findMany({
    where: {
      departureTime: null,
      arrivalTime: { gte: todayUTC, lt: tomorrowUTC },
      user: { companyId: user.companyId },
    },
    include: {
      user: { select: { name: true, email: true } },
      site: { select: { id: true, name: true } },
      breaks: { where: { endedAt: null }, select: { id: true }, take: 1 },
    },
    orderBy: { arrivalTime: 'asc' },
  })

  const bySite = new Map<string, { site: { id: string; name: string } | null; people: { name: string; onBreak: boolean }[] }>()
  for (const r of records) {
    const key = r.siteId ?? '__none__'
    if (!bySite.has(key)) bySite.set(key, { site: r.site, people: [] })
    bySite.get(key)!.people.push({ name: r.user.name || r.user.email.split('@')[0], onBreak: r.breaks.length > 0 })
  }

  const groups = Array.from(bySite.values()).sort((a, b) => {
    if (!a.site) return 1
    if (!b.site) return -1
    return a.site.name.localeCompare(b.site.name, 'fr')
  })

  return NextResponse.json({ groups, total: records.length, asOf: new Date().toISOString() })
}
