import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { rateLimit } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'
import { currentStep, qrCode, qrScanUrl, safeInterval, stepExpiresAt, isDynamicQrMode } from '@/lib/kiosk-qr'
import { clientIp } from '@/lib/client-ip'

// Current rotating QR of a kiosk terminal, polled by the tablet. Only the terminal's secret link
// can read it; the HMAC secret itself never leaves the server.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const ip = clientIp(req.headers) ?? 'unknown'
    // Two calls per minute at 30 s; the margin covers retries after a network drop.
    const rl = rateLimit(`kiosk-qr:${ip}:${token}`, 30, 5 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const terminal = await prisma.kioskToken.findUnique({
      where: { token },
      select: { companyId: true, displayMode: true, qrPublicId: true, qrSecret: true, qrIntervalSeconds: true },
    })
    if (!terminal) return NextResponse.json({ error: 'Terminal introuvable' }, { status: 404 })
    if (!isDynamicQrMode(terminal.displayMode) || !terminal.qrPublicId || !terminal.qrSecret) {
      return NextResponse.json({ error: 'QR dynamique désactivé sur ce terminal' }, { status: 409 })
    }

    const plan = await getCompanyPlan(terminal.companyId)
    if (!planCanAccess(plan, 'kiosk')) {
      return NextResponse.json({ error: 'Plan insuffisant', upgrade: true }, { status: 403 })
    }

    const now = new Date()
    const interval = safeInterval(terminal.qrIntervalSeconds)
    const code = qrCode(terminal.qrSecret, terminal.qrPublicId, currentStep(now, interval))
    const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
    const dataUrl = await QRCode.toDataURL(qrScanUrl(base, terminal.qrPublicId, code), {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 480,
      color: { dark: '#000000', light: '#ffffff' },
    })

    return NextResponse.json(
      { dataUrl, expiresAt: stepExpiresAt(now, interval).toISOString(), intervalSeconds: interval, serverTime: now.toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
