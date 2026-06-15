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
      select: { companyId: true },
    })
    if (!kioskToken) return NextResponse.json({ error: 'Terminal introuvable' }, { status: 404 })

    const plan = await getCompanyPlan(kioskToken.companyId)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
    }

    const employees = await prisma.user.findMany({
      where: { companyId: kioskToken.companyId, active: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(employees)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
