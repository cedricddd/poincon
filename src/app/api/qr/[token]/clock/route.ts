import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'
import { resolveQrAccess, QR_ACCESS_ERRORS } from '@/lib/qr-access'
import { handleQrClock } from '@/lib/qr-clock'
import { siteHasDynamicQr, STATIC_QR_DISABLED } from '@/lib/kiosk-qr-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const site = await prisma.site.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      name: true,
      active: true,
      company: { select: { id: true, name: true, logoUrl: true, qrAccountOnly: true } },
    },
  })
  if (!site || !site.active) {
    return NextResponse.json({ error: 'QR code invalide' }, { status: 404 })
  }
  if (await siteHasDynamicQr(site.company.id, site.id)) {
    const { status, code, error } = STATIC_QR_DISABLED
    return NextResponse.json({ error, code }, { status })
  }
  const access = await resolveQrAccess(site.company)
  if (access.kind === 'other_company' || access.kind === 'login_required') {
    const { status, code, error } = QR_ACCESS_ERRORS[access.kind]
    return NextResponse.json({ error, code }, { status })
  }
  return NextResponse.json({
    siteName: site.name,
    companyName: site.company.name,
    logoUrl: site.company.logoUrl,
    mode: access.kind,
    ...(access.kind === 'account' ? { firstName: access.user.name.split(' ')[0] } : {}),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    const rl = rateLimit(`qr-clock:${ip}:${token}`, 30, 5 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 5 minutes.' }, { status: 429 })
    }

    const site = await prisma.site.findUnique({
      where: { qrToken: token },
      select: {
        id: true,
        active: true,
        company: { select: { id: true, name: true, logoUrl: true, mealBreakEnabled: true, qrAccountOnly: true } },
      },
    })

    if (!site || !site.active) {
      return NextResponse.json({ error: 'QR code invalide' }, { status: 404 })
    }

    const plan = await getCompanyPlan(site.company.id)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Fonctionnalité non disponible sur votre plan' }, { status: 403 })
    }

    // A terminal shows a rotating QR for this site: the printed one is retired.
    if (await siteHasDynamicQr(site.company.id, site.id)) {
      const { status, code, error } = STATIC_QR_DISABLED
      return NextResponse.json({ error, code }, { status })
    }

    const access = await resolveQrAccess(site.company)
    if (access.kind === 'other_company' || access.kind === 'login_required') {
      const { status, code, error } = QR_ACCESS_ERRORS[access.kind]
      return NextResponse.json({ error, code }, { status })
    }

    const body = await req.json().catch(() => ({}))
    return await handleQrClock({
      company: site.company,
      siteId: site.id,
      access,
      body: body ?? {},
      ip,
      rateKey: token,
      audit: { via: 'qr', ref: { token }, resource: 'site', resourceId: site.id },
    })
  } catch (err) {
    console.error('QR clock error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
