import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { canAddEmployee, getActiveMemberCount } from '@/lib/plan'
import { syncSeatQuantitySafe } from '@/lib/billing'

type SetUserActiveParams = {
  companyId: string
  actorId: string
  targetId: string
  active: boolean
  ipAddress?: string
}

type SetUserActiveResult = { ok: true } | { ok: false; status: number; error: string }

/**
 * Deactivate or reactivate a company member.
 *
 * Deactivation is the way to handle a leaver: the account can no longer sign in
 * or clock, its seat is freed, and every clock record stays in place for the
 * legal retention period — unlike deletion, which cascades to the whole history.
 */
export async function setUserActive(params: SetUserActiveParams): Promise<SetUserActiveResult> {
  const { companyId, actorId, targetId, active, ipAddress } = params

  const target = await prisma.user.findFirst({
    where: { id: targetId, companyId, deletedAt: null },
    select: { id: true, active: true },
  })
  if (!target) return { ok: false, status: 404, error: 'Utilisateur introuvable' }

  if (target.active === active) return { ok: true }

  if (!active) {
    if (targetId === actorId) {
      return { ok: false, status: 400, error: 'Impossible de désactiver votre propre compte' }
    }
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { adminId: true } })
    if (company?.adminId === targetId) {
      return { ok: false, status: 400, error: 'Impossible de désactiver le compte propriétaire de la société' }
    }
  } else {
    const activeMembers = await getActiveMemberCount(companyId)
    if (!await canAddEmployee(companyId, activeMembers)) {
      return { ok: false, status: 403, error: 'Limite du plan atteinte. Passez à un plan supérieur pour réactiver ce compte.' }
    }
  }

  await prisma.user.update({ where: { id: targetId }, data: { active } })

  await logAudit({
    userId: actorId,
    action: active ? 'admin_reactivate_user' : 'admin_deactivate_user',
    resource: 'User',
    resourceId: targetId,
    ipAddress,
  })

  // Headcount changed → reconcile billed seats with Stripe (non-blocking)
  syncSeatQuantitySafe(companyId)

  return { ok: true }
}

/**
 * JWT sessions outlive a deactivation (up to 90 days), so clocking endpoints
 * re-check the account state on every write.
 */
export async function isUserActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { active: true, deletedAt: true },
  })
  return !!user && user.active && !user.deletedAt
}
