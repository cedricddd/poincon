import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// Dynamic QR shown on a kiosk terminal. The tablet displays `${base}/qr/t/${publicId}?c=${code}`
// and the code changes every `interval` seconds. Codes are derived (HMAC of the time step), so
// nothing is written to the database when they change. Only the server knows the secret.

export const KIOSK_DISPLAY_MODES = ['pin', 'qr', 'qr_pin'] as const
export type KioskDisplayMode = typeof KIOSK_DISPLAY_MODES[number]

export const QR_INTERVALS = [30, 60] as const
export const DEFAULT_QR_INTERVAL = 30

const CODE_LENGTH = 12
const CODE_RE = /^[A-Za-z0-9_-]{12}$/

export function isDynamicQrMode(mode: string | null | undefined): boolean {
  return mode === 'qr' || mode === 'qr_pin'
}

export function isValidInterval(seconds: unknown): seconds is typeof QR_INTERVALS[number] {
  return (QR_INTERVALS as readonly unknown[]).includes(seconds)
}

/** Falls back to the default for any stored value outside the allowed set. */
export function safeInterval(seconds: number | null | undefined): number {
  return isValidInterval(seconds) ? seconds : DEFAULT_QR_INTERVAL
}

export function generateQrPublicId(): string {
  return randomBytes(16).toString('base64url')
}

export function generateQrSecret(): string {
  return randomBytes(32).toString('base64url')
}

export function currentStep(now: Date, intervalSeconds: number): number {
  return Math.floor(now.getTime() / 1000 / intervalSeconds)
}

/** When the code of the current step stops being the one on screen. */
export function stepExpiresAt(now: Date, intervalSeconds: number): Date {
  return new Date((currentStep(now, intervalSeconds) + 1) * intervalSeconds * 1000)
}

export function qrCode(secret: string, publicId: string, step: number): string {
  return createHmac('sha256', secret).update(`${publicId}:${step}`).digest('base64url').slice(0, CODE_LENGTH)
}

/**
 * True when `code` is the code of the current step or the previous one. The previous step
 * covers a scan made just before the code changed, so a photo of the screen stays usable for
 * at most two intervals.
 */
export function verifyQrCode(
  secret: string,
  publicId: string,
  code: unknown,
  now: Date,
  intervalSeconds: number,
): boolean {
  if (typeof code !== 'string' || !CODE_RE.test(code)) return false
  const step = currentStep(now, intervalSeconds)
  const given = Buffer.from(code)
  let ok = false
  // Both comparisons always run, so the timing does not tell which step matched.
  for (const s of [step, step - 1]) {
    const expected = Buffer.from(qrCode(secret, publicId, s))
    if (timingSafeEqual(expected, given)) ok = true
  }
  return ok
}

export function qrScanUrl(base: string, publicId: string, code: string): string {
  return `${base.replace(/\/$/, '')}/qr/t/${encodeURIComponent(publicId)}?c=${encodeURIComponent(code)}`
}
