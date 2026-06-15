import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

async function requireAdminCompany(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, companyId: true },
  })
  if (!isAdminRole(user?.role) || !user?.companyId) return null
  return { userId: session.user.id, companyId: user.companyId }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdminCompany(req)
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const plan = await getCompanyPlan(ctx.companyId)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Upgrade required', plan }, { status: 403 })
    }

    const [tokens, sites] = await Promise.all([
      prisma.kioskToken.findMany({
        where: { companyId: ctx.companyId },
        include: { site: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.site.findMany({
        where: { companyId: ctx.companyId, active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({ tokens, sites, plan })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdminCompany(req)
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const plan = await getCompanyPlan(ctx.companyId)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Upgrade required' }, { status: 403 })
    }

    const { label, siteId, theme } = await req.json()

    // Validate siteId belongs to this company
    if (siteId) {
      const site = await prisma.site.findFirst({
        where: { id: siteId, companyId: ctx.companyId },
      })
      if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 400 })
    }

    const token = randomBytes(24).toString('base64url')
    const safeTheme = theme === 'light' ? 'light' : 'dark'

    const kioskToken = await prisma.kioskToken.create({
      data: {
        token,
        companyId: ctx.companyId,
        theme: safeTheme,
        ...(siteId ? { siteId } : {}),
        ...(label ? { label: label.trim() } : {}),
      },
      include: { site: { select: { id: true, name: true } } },
    })

    return NextResponse.json(kioskToken, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
