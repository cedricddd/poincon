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

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })
  if (!admin?.companyId) return NextResponse.json({ error: 'Company not found' }, { status: 400 })

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId') ?? undefined
  const action = url.searchParams.get('action') ?? undefined
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const where: any = { user: { companyId: admin.companyId } }
  if (userId) where.userId = userId
  if (action) where.action = action
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59')
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  const rows = [
    ['Date/Heure', 'Utilisateur', 'Email', 'Action', 'Ressource', 'Ressource ID', 'Statut', 'Adresse IP', 'Changements'],
    ...logs.map(log => [
      new Date(log.createdAt).toLocaleString('fr-BE', { timeZone: 'Europe/Brussels' }),
      log.user?.name ?? 'Anonymisé',
      log.user?.email ?? '',
      log.action,
      log.resource,
      log.resourceId ?? '',
      log.status,
      log.ipAddress ?? '',
      log.changes ? log.changes.replace(/"/g, '""') : '',
    ]),
  ]

  const csv = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  const filename = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
