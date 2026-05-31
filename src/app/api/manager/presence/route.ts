import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getPresenceAccess } from '@/lib/plan'

async function requireManager() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, companyId: true },
  })
  if (!user?.companyId) return null
  const allowed = ['MANAGER', 'ADMIN', 'SUPER_ADMIN']
  if (!allowed.includes(user.role ?? '')) return null
  return user
}

export async function GET(req: NextRequest) {
  const user = await requireManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { hasAccess, presenceForManagers } = await getPresenceAccess(user.companyId!)
  if (!hasAccess) return NextResponse.json({ error: 'Plan insuffisant — fonctionnalité Présences non disponible' }, { status: 403 })
  if (!presenceForManagers) return NextResponse.json({ error: 'Fonctionnalité désactivée par votre administrateur' }, { status: 403 })

  const scope = req.nextUrl.searchParams.get('scope') ?? 'team'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let memberIds: string[] | undefined

  if (scope === 'team') {
    // Only members of teams managed by this user
    const managedTeams = await prisma.teamMember.findMany({
      where: { userId: user.id, role: 'manager' },
      select: { teamId: true },
    })
    const teamIds = managedTeams.map(t => t.teamId)
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: { in: teamIds } },
      select: { userId: true },
    })
    memberIds = [...new Set(teamMembers.map(m => m.userId))]
  }

  const records = await prisma.clockRecord.findMany({
    where: {
      departureTime: null,
      date: { gte: today, lt: tomorrow },
      user: {
        companyId: user.companyId!,
        ...(memberIds !== undefined && { id: { in: memberIds } }),
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: { arrivalTime: 'asc' },
  })

  const bySite = new Map<string, { site: { id: string; name: string } | null; people: typeof records }>()
  for (const r of records) {
    const key = r.siteId ?? '__none__'
    if (!bySite.has(key)) bySite.set(key, { site: r.site, people: [] })
    bySite.get(key)!.people.push(r)
  }

  const groups = Array.from(bySite.values()).sort((a, b) => {
    if (!a.site) return 1
    if (!b.site) return -1
    return a.site.name.localeCompare(b.site.name, 'fr')
  })

  return NextResponse.json({ groups, total: records.length, asOf: new Date().toISOString(), scope })
}
