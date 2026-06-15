import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    const rl = rateLimit(`kiosk-depart:${ip}:${token}`, 10, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 1 minute.' }, { status: 429 })
    }

    const kioskToken = await prisma.kioskToken.findUnique({
      where: { token },
      select: { companyId: true },
    })
    if (!kioskToken) return NextResponse.json({ error: 'Terminal introuvable' }, { status: 404 })

    const plan = await getCompanyPlan(kioskToken.companyId)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
    }

    const { email } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find the most recent open visit for this email today
    const visit = await prisma.kioskVisit.findFirst({
      where: {
        companyId: kioskToken.companyId,
        visitorEmail: { equals: email.trim(), mode: 'insensitive' },
        arrivedAt: { gte: today, lt: tomorrow },
        departedAt: null,
      },
      orderBy: { arrivedAt: 'desc' },
    })

    if (!visit) {
      return NextResponse.json({ error: 'Aucune visite en cours trouvée pour cet email.' }, { status: 404 })
    }

    const updated = await prisma.kioskVisit.update({
      where: { id: visit.id },
      data: { departedAt: new Date() },
    })

    return NextResponse.json({
      ok: true,
      visitorName: updated.visitorName,
      departedAt: updated.departedAt,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
