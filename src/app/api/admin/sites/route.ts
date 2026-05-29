import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { getCompanyPlan, PLAN_LIMITS } from '@/lib/plan'
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

  const [plan, currentCount] = await Promise.all([
    getCompanyPlan(auth.admin.companyId),
    prisma.site.count({ where: { companyId: auth.admin.companyId } }),
  ])
  const maxSites = PLAN_LIMITS[plan].maxSites
  if (maxSites !== -1 && currentCount >= maxSites) {
    return NextResponse.json(
      { error: `Votre plan ${plan} est limité à ${maxSites} site${maxSites > 1 ? 's' : ''}. Passez à un plan supérieur pour en ajouter davantage.` },
      { status: 403 }
    )
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
