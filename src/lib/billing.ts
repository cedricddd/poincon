import { prisma } from '@/lib/prisma'
import { getStripe, STRIPE_PLAN_CONFIG } from '@/lib/stripe'
import { getActiveMemberCount } from '@/lib/plan'

/**
 * Reconcile the "extra seats" Stripe subscription item quantity for a company
 * with its current active member count.
 *
 * Soft billing model: every active member beyond the plan's included seats is
 * billed per-seat. Idempotent — safe to call on every headcount change and from
 * the nightly reconciliation cron.
 *
 * Proration of the change depends on the billing cycle:
 *  - yearly  → 'always_invoice'    charge the prorated amount immediately,
 *              otherwise the new seat would be free until the yearly renewal.
 *  - monthly → 'create_prorations' rides onto the next monthly invoice (≤ 1 month away),
 *              avoiding a flood of tiny 2-3€ invoices.
 *
 * No-op for companies without an active paid subscription (FREE / Enterprise / unpaid).
 */
export async function syncSeatQuantity(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      stripeSubscriptionId: true,
      stripeSeatItemId: true,
      stripeSubscriptionBillingCycle: true,
      billedSeats: true,
      plan: { select: { name: true } },
    },
  })
  if (!company?.stripeSubscriptionId) return // no active subscription → nothing to bill

  const planName = company.plan?.name?.toUpperCase()
  const config = planName ? STRIPE_PLAN_CONFIG[planName] : undefined
  if (!config || config.baseIncludedSeats < 0) return // unknown plan or unlimited (Enterprise)

  const isYearly = company.stripeSubscriptionBillingCycle === 'yearly'
  const seatPriceId = isYearly ? config.stripePriceIdExtraSeatYearly : config.stripePriceIdExtraSeatMonthly
  if (!seatPriceId) {
    console.error('[billing] missing seat price id for plan', planName, 'yearly=', isYearly)
    return
  }

  const members = await getActiveMemberCount(companyId)
  const seats = Math.max(0, members - config.baseIncludedSeats)

  // Already in sync (and item state consistent) → avoid redundant Stripe calls
  if (seats === company.billedSeats && (seats > 0) === !!company.stripeSeatItemId) return

  const stripe = getStripe()
  const proration_behavior = isYearly ? 'always_invoice' : 'create_prorations'
  let seatItemId = company.stripeSeatItemId

  if (seatItemId) {
    if (seats === 0) {
      await stripe.subscriptionItems.del(seatItemId, { proration_behavior })
      seatItemId = null
    } else {
      await stripe.subscriptionItems.update(seatItemId, { quantity: seats, proration_behavior })
    }
  } else if (seats > 0) {
    // Guard against a duplicate item if a previous sync pushed to Stripe but lost the id
    const existing = await stripe.subscriptionItems.list({ subscription: company.stripeSubscriptionId })
    const found = existing.data.find(i => i.price.id === seatPriceId)
    if (found) {
      await stripe.subscriptionItems.update(found.id, { quantity: seats, proration_behavior })
      seatItemId = found.id
    } else {
      const item = await stripe.subscriptionItems.create({
        subscription: company.stripeSubscriptionId,
        price: seatPriceId,
        quantity: seats,
        proration_behavior,
      })
      seatItemId = item.id
    }
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { stripeSeatItemId: seatItemId, billedSeats: seats },
  })
  console.log('[billing] seats synced for company', companyId, '→', seats, 'extra seat(s)')
}

/**
 * Fire-and-forget wrapper: never throws into the caller's request path.
 * Use at headcount-change trigger points (invitation accepted, deactivation, etc.).
 */
export function syncSeatQuantitySafe(companyId: string): void {
  syncSeatQuantity(companyId).catch(err =>
    console.error('[billing] seat sync failed for company', companyId, err instanceof Error ? err.message : err)
  )
}
