import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export type QrAccess =
  | { kind: 'other_company' }
  | { kind: 'login_required' }
  | { kind: 'account'; user: { id: string; name: string } }
  | { kind: 'pin' }

export const QR_ACCESS_ERRORS = {
  other_company: { status: 403, code: 'OTHER_COMPANY', error: 'Ce QR code appartient à une autre société.' },
  login_required: { status: 401, code: 'LOGIN_REQUIRED', error: 'Connectez-vous à Pointon pour pointer avec ce QR code.' },
} as const

/**
 * Decides how a QR scan is handled, based on the device's Pointon session:
 * - signed in to another company (super admin included) → blocked
 * - company requires accounts → identity comes from the session, no PIN
 * - otherwise → anonymous PIN flow, unchanged
 */
export async function resolveQrAccess(company: { id: string; qrAccountOnly: boolean }): Promise<QrAccess> {
  const session = await auth()
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, companyId: true, active: true, deletedAt: true },
      })
    : null
  const signedIn = !!user && user.active && !user.deletedAt

  if (signedIn && user.companyId !== company.id) return { kind: 'other_company' }
  if (!company.qrAccountOnly) return { kind: 'pin' }

  const twoFactorPending = !!session?.user?.twoFactorEnabled && !session.user.twoFactorVerified
  if (!signedIn || twoFactorPending) return { kind: 'login_required' }
  return { kind: 'account', user: { id: user.id, name: user.name ?? 'Employé' } }
}
