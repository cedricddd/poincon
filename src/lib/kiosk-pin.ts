import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const PIN_REGEX = /^\d{4}$/

export type PinUser = { id: string; name: string }

/**
 * Returns every active employee of the company whose kiosk PIN matches.
 * Scans all candidates (no early exit) so callers can detect shared PINs.
 */
export async function findUsersByPin(
  companyId: string,
  pin: string,
  opts: { excludeUserId?: string } = {}
): Promise<PinUser[]> {
  const candidates = await prisma.user.findMany({
    where: {
      companyId,
      active: true,
      deletedAt: null,
      kioskPin: { not: null },
      ...(opts.excludeUserId ? { id: { not: opts.excludeUserId } } : {}),
    },
    select: { id: true, name: true, kioskPin: true },
  })

  const matches: PinUser[] = []
  for (const u of candidates) {
    if (u.kioskPin && await bcrypt.compare(pin, u.kioskPin)) {
      matches.push({ id: u.id, name: u.name ?? 'Employé' })
    }
  }
  return matches
}
