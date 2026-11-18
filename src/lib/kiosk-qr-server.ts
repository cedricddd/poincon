import { prisma } from '@/lib/prisma'

// Database side of the dynamic kiosk QR (the pure code logic lives in kiosk-qr.ts).

export const DYNAMIC_QR_MODES = ['qr', 'qr_pin']

/**
 * True when a terminal of the company shows a dynamic QR for this site (or for all sites).
 * The printed QR of that site is then refused: otherwise a photo of it would bypass the
 * rotating code.
 */
export async function siteHasDynamicQr(companyId: string, siteId: string): Promise<boolean> {
  const terminal = await prisma.kioskToken.findFirst({
    where: {
      companyId,
      displayMode: { in: DYNAMIC_QR_MODES },
      OR: [{ siteId }, { siteId: null }],
    },
    select: { id: true },
  })
  return !!terminal
}

export const STATIC_QR_DISABLED = {
  status: 403,
  code: 'QR_DYNAMIC_ONLY',
  error: 'Ce QR code n\'est plus utilisé : scannez le QR code affiché sur la tablette.',
} as const

/** Terminal behind a scanned dynamic QR, with what the clock route needs. Null if not in a QR mode. */
export async function findDynamicTerminal(qrPublicId: string) {
  const terminal = await prisma.kioskToken.findUnique({
    where: { qrPublicId },
    select: {
      id: true,
      siteId: true,
      displayMode: true,
      qrPublicId: true,
      qrSecret: true,
      qrIntervalSeconds: true,
      site: { select: { name: true, active: true } },
      company: { select: { id: true, name: true, logoUrl: true, mealBreakEnabled: true, qrAccountOnly: true } },
    },
  })
  if (!terminal || !terminal.qrSecret || !terminal.qrPublicId) return null
  if (!DYNAMIC_QR_MODES.includes(terminal.displayMode)) return null
  if (terminal.site && !terminal.site.active) return null
  return { ...terminal, qrSecret: terminal.qrSecret, qrPublicId: terminal.qrPublicId }
}

/** A terminal as sent to the admin UI: the HMAC secret never leaves the server. */
export function publicTerminal<T extends { qrSecret?: string | null }>(terminal: T): Omit<T, 'qrSecret'> {
  const { qrSecret: _secret, ...rest } = terminal
  return rest
}
