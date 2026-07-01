import { prisma } from '@/lib/prisma'
import { forceRotateSiteQrToken } from '@/lib/qr-token'
import { sendEmail } from '@/lib/mail'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Rotate the printed site QR code for kiosk terminals that have opted into
 * automatic rotation (addon_kiosk_advanced, autoRotateEnabled=true — false by
 * default on every row, so this is a strict no-op for everyone else).
 *
 * A previous nightly-rotation-for-everyone design was removed (commit 62ef031)
 * because it silently broke printed QR codes. This cron must stay opt-in only,
 * and must always notify the admin so a stale printed QR doesn't go unnoticed.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tokens = await prisma.kioskToken.findMany({
    where: { autoRotateEnabled: true, autoRotateIntervalHours: { not: null }, siteId: { not: null } },
    include: { site: { select: { id: true, name: true } }, company: { select: { id: true, name: true, adminId: true } } },
  })

  const rotated: string[] = []

  for (const kt of tokens) {
    const dueAt = kt.lastRotatedAt
      ? new Date(kt.lastRotatedAt.getTime() + kt.autoRotateIntervalHours! * 3600_000)
      : new Date(0) // jamais rotaté → dû immédiatement
    if (new Date() < dueAt) continue

    await forceRotateSiteQrToken(kt.siteId!)
    await prisma.kioskToken.update({ where: { id: kt.id }, data: { lastRotatedAt: new Date() } })
    rotated.push(kt.id)

    const admin = await prisma.user.findUnique({ where: { id: kt.company.adminId }, select: { email: true, name: true } })
    if (admin?.email) {
      await sendEmail({
        to: admin.email,
        subject: `Pointon — QR code régénéré (${kt.site?.name ?? 'site'})`,
        html: `<p>Bonjour${admin.name ? ` ${admin.name}` : ''},</p>
<p>Le QR code de pointage du site <strong>${kt.site?.name ?? kt.siteId}</strong> vient d'être régénéré automatiquement (rotation programmée activée).</p>
<p><strong>Tout QR code imprimé pour ce site n'est plus valide</strong> — pensez à réimprimer le nouveau QR depuis l'admin Pointon.</p>`,
      }).catch(err => console.error('[cron] kiosk rotation email failed', kt.id, err))
    }
  }

  return NextResponse.json({ rotated: rotated.length })
}
