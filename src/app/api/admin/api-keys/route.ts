import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { companyHasAddon } from '@/lib/plan'
import { generateApiKey } from '@/lib/apikey'
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

  if (!await companyHasAddon(companyId, 'addon_api_access')) {
    return NextResponse.json({ error: 'Add-on API Access requis' }, { status: 403 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { companyId },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  if (!await companyHasAddon(companyId, 'addon_api_access')) {
    return NextResponse.json({ error: 'Add-on API Access requis' }, { status: 403 })
  }

  const { name, expiresAt } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name requis' }, { status: 400 })

  const count = await prisma.apiKey.count({ where: { companyId } })
  if (count >= 10) return NextResponse.json({ error: 'Maximum 10 clés API par company' }, { status: 400 })

  const { raw, hash, prefix } = generateApiKey()

  const key = await prisma.apiKey.create({
    data: {
      companyId,
      createdBy: session.user.id,
      name: name.trim(),
      keyHash: hash,
      keyPrefix: prefix,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: 'admin_create', resource: 'api_key', resourceId: key.id, changes: JSON.stringify({ name }) },
  })

  // Return raw key only once — it won't be retrievable again
  return NextResponse.json({ key: { ...key, rawKey: raw } }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const key = await prisma.apiKey.findFirst({ where: { id, companyId } })
  if (!key) return NextResponse.json({ error: 'Clé introuvable' }, { status: 404 })

  await prisma.apiKey.delete({ where: { id } })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: 'admin_delete', resource: 'api_key', resourceId: id },
  })

  return NextResponse.json({ success: true })
}
