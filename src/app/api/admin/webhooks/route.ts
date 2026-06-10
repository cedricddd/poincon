import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { companyHasAddon } from '@/lib/plan'
import { generateWebhookSecret, WEBHOOK_EVENT_LABELS } from '@/lib/webhook'
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

  if (!await companyHasAddon(companyId, 'addon_webhooks')) {
    return NextResponse.json({ error: 'Add-on Webhooks requis' }, { status: 403 })
  }

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { companyId },
    include: {
      deliveries: {
        orderBy: { attemptedAt: 'desc' },
        take: 5,
        select: { event: true, success: true, statusCode: true, attemptedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ endpoints, eventTypes: Object.keys(WEBHOOK_EVENT_LABELS) })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  if (!await companyHasAddon(companyId, 'addon_webhooks')) {
    return NextResponse.json({ error: 'Add-on Webhooks requis' }, { status: 403 })
  }

  const { url, events = [], description } = await req.json()
  if (!url?.trim()) return NextResponse.json({ error: 'url requis' }, { status: 400 })

  try { new URL(url) } catch { return NextResponse.json({ error: 'URL invalide' }, { status: 400 }) }

  const count = await prisma.webhookEndpoint.count({ where: { companyId } })
  if (count >= 10) return NextResponse.json({ error: 'Maximum 10 webhooks' }, { status: 400 })

  const secret = generateWebhookSecret()

  const endpoint = await prisma.webhookEndpoint.create({
    data: { companyId, url: url.trim(), secret, events: JSON.stringify(events), description: description?.trim() ?? null },
  })

  return NextResponse.json({ endpoint: { ...endpoint, secret }, message: 'Secret affiché une seule fois — conservez-le.' }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { id, url, events, description, enabled } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const existing = await prisma.webhookEndpoint.findFirst({ where: { id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const endpoint = await prisma.webhookEndpoint.update({
    where: { id },
    data: {
      ...(url && { url }),
      ...(events !== undefined && { events: JSON.stringify(events) }),
      ...(description !== undefined && { description }),
      ...(enabled !== undefined && { enabled }),
    },
  })

  return NextResponse.json({ endpoint })
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const existing = await prisma.webhookEndpoint.findFirst({ where: { id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  await prisma.webhookEndpoint.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
