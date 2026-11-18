import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'
import { resolveQrAccess, QR_ACCESS_ERRORS } from '@/lib/qr-access'
import { handleQrClock } from '@/lib/qr-clock'
import { findDynamicTerminal } from '@/lib/kiosk-qr-server'
import { verifyQrCode, safeInterval } from '@/lib/kiosk-qr'

// Clocking from the rotating QR shown on a kiosk terminal. The scanned link carries the code of
// the time step; it is checked again here, so a photo of the screen expires within two intervals.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    const rl = rateLimit(`qr-dyn-clock:${ip}:${id}`, 30, 5 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 5 minutes.' }, { status: 429 })
    }

    const terminal = await findDynamicTerminal(id)
    if (!terminal) {
      return NextResponse.json({ error: 'QR code invalide' }, { status: 404 })
    }

    const body = (await req.json().catch(() => null)) ?? {}
    if (!verifyQrCode(terminal.qrSecret, terminal.qrPublicId, body.code, new Date(), safeInterval(terminal.qrIntervalSeconds))) {
      return NextResponse.json(
        { error: 'QR code expiré : scannez à nouveau le code affiché sur la tablette.', code: 'QR_EXPIRED' },
        { status: 410 }
      )
    }

    const plan = await getCompanyPlan(terminal.company.id)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Fonctionnalité non disponible sur votre plan' }, { status: 403 })
    }

    const access = await resolveQrAccess(terminal.company)
    if (access.kind === 'other_company' || access.kind === 'login_required') {
      const { status, code, error } = QR_ACCESS_ERRORS[access.kind]
      return NextResponse.json({ error, code }, { status })
    }

    return await handleQrClock({
      company: terminal.company,
      siteId: terminal.siteId,
      access,
      body: { pin: body.pin, action: body.action },
      ip,
      rateKey: id,
      // Audit keeps the public QR id, never the code nor the terminal token.
      audit: { via: 'qr_dynamic', ref: { qrId: terminal.qrPublicId }, resource: 'kioskToken', resourceId: terminal.id },
    })
  } catch (err) {
    console.error('Dynamic QR clock error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
