import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'
import { sendKioskVisitorEmail } from '@/lib/mail'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    const rl = rateLimit(`kiosk-visit:${ip}:${token}`, 5, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de soumissions. Réessayez dans 1 minute.' }, { status: 429 })
    }

    const kioskToken = await prisma.kioskToken.findUnique({
      where: { token },
      select: { companyId: true, siteId: true },
    })
    if (!kioskToken) return NextResponse.json({ error: 'Terminal introuvable' }, { status: 404 })

    const plan = await getCompanyPlan(kioskToken.companyId)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
    }

    const { visitorName, visitorEmail, hostUserId } = await req.json()
    if (!visitorName?.trim() || !visitorEmail?.trim() || !hostUserId) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    // Validate host belongs to the same company
    const host = await prisma.user.findFirst({
      where: { id: hostUserId, companyId: kioskToken.companyId, active: true, deletedAt: null },
      select: { id: true, name: true, email: true },
    })
    if (!host) return NextResponse.json({ error: 'Hôte introuvable' }, { status: 400 })

    const company = await prisma.company.findUnique({
      where: { id: kioskToken.companyId },
      select: { name: true },
    })

    const arrivedAt = new Date()
    await prisma.kioskVisit.create({
      data: {
        companyId: kioskToken.companyId,
        ...(kioskToken.siteId ? { siteId: kioskToken.siteId } : {}),
        visitorName: visitorName.trim(),
        visitorEmail: visitorEmail.trim(),
        hostUserId,
        arrivedAt,
      },
    })

    // Send email to host (fire and forget)
    sendKioskVisitorEmail({
      to: host.email,
      hostName: host.name,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.trim(),
      companyName: company?.name ?? '',
      arrivedAt,
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Kiosk visit error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
