import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const kioskToken = await prisma.kioskToken.findUnique({
      where: { token },
      include: {
        company: { select: { id: true, name: true, logoUrl: true } },
        site: { select: { id: true, name: true } },
      },
    })

    if (!kioskToken) return NextResponse.json({ error: 'Terminal introuvable' }, { status: 404 })

    const plan = await getCompanyPlan(kioskToken.companyId)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Plan insuffisant', upgrade: true }, { status: 403 })
    }

    return NextResponse.json({
      companyId: kioskToken.companyId,
      companyName: kioskToken.company.name,
      logoUrl: kioskToken.company.logoUrl,
      siteId: kioskToken.siteId,
      siteName: kioskToken.site?.name ?? null,
      label: kioskToken.label,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
