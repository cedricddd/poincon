import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess, companyHasAddon } from '@/lib/plan'
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

    // Branding par terminal (addon_kiosk_advanced) — dégradation gracieuse sur le logo/thème
    // par défaut de la company si l'addon n'est pas actif (ou plus actif).
    const hasAdvancedKiosk = await companyHasAddon(kioskToken.companyId, 'addon_kiosk_advanced')

    return NextResponse.json({
      companyId: kioskToken.companyId,
      companyName: kioskToken.company.name,
      logoUrl: (hasAdvancedKiosk && kioskToken.logoUrl) || kioskToken.company.logoUrl,
      accentColor: hasAdvancedKiosk ? kioskToken.accentColor : null,
      siteId: kioskToken.siteId,
      siteName: kioskToken.site?.name ?? null,
      label: kioskToken.label,
      theme: kioskToken.theme,
      visitorsEnabled: kioskToken.visitorsEnabled,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
