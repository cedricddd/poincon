import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const sites = await prisma.site.findMany({
    where: { companyId: auth.admin.companyId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  })
  return NextResponse.json(sites)
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { name, address } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Le nom du site est requis' }, { status: 400 })
  }

  const site = await prisma.site.create({
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      companyId: auth.admin.companyId,
    },
  })
  return NextResponse.json(site, { status: 201 })
}
