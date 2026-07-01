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

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  if (!await companyHasAddon(companyId, 'addon_custom_reports')) {
    return NextResponse.json({ error: 'Add-on Rapports custom requis' }, { status: 403 })
  }

  const templates = await prisma.reportTemplate.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  if (!await companyHasAddon(companyId, 'addon_custom_reports')) {
    return NextResponse.json({ error: 'Add-on Rapports custom requis' }, { status: 403 })
  }

  const { name, config, scheduledFrequency, recipientEmails } = await req.json()
  if (!name?.trim() || !config) {
    return NextResponse.json({ error: 'name et config requis' }, { status: 400 })
  }
  if (scheduledFrequency && !['weekly', 'monthly'].includes(scheduledFrequency)) {
    return NextResponse.json({ error: 'scheduledFrequency invalide' }, { status: 400 })
  }

  const count = await prisma.reportTemplate.count({ where: { companyId } })
  if (count >= 20) return NextResponse.json({ error: 'Maximum 20 templates par company' }, { status: 400 })

  const template = await prisma.reportTemplate.create({
    data: {
      companyId,
      createdBy: session.user.id,
      name: name.trim(),
      config: JSON.stringify(config),
      scheduledFrequency: scheduledFrequency ?? null,
      recipientEmails: Array.isArray(recipientEmails) ? JSON.stringify(recipientEmails) : null,
    },
  })

  return NextResponse.json({ template }, { status: 201 })
}
