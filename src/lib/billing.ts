import { prisma } from '@/lib/prisma'
import { getStripe, STRIPE_PLAN_CONFIG, STRIPE_ADDON_CONFIG } from '@/lib/stripe'
import { getActiveMemberCount, type AddonFlag } from '@/lib/plan'

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
      stripeSeatPriceId: true,
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

  // A plan change (e.g. STARTER→TEAM) leaves the existing item on the OLD plan's
  // seat price — quantity alone can't fix that, the item must be recreated below.
  // Require a known (non-null) stripeSeatPriceId: right after the column is introduced,
  // every pre-existing company has it null, which must NOT be treated as a mismatch —
  // that would delete+recreate every paid company's seat item for no real reason.
  const priceMismatch =
    seats > 0 && !!company.stripeSeatItemId && !!company.stripeSeatPriceId && company.stripeSeatPriceId !== seatPriceId

  // Already in sync (quantity, presence AND price all consistent) → avoid redundant Stripe calls
  if (!priceMismatch && seats === company.billedSeats && (seats > 0) === !!company.stripeSeatItemId) return

  const stripe = getStripe()
  const proration_behavior = isYearly ? 'always_invoice' : 'create_prorations'
  let seatItemId = company.stripeSeatItemId

  if (seatItemId && (seats === 0 || priceMismatch)) {
    await stripe.subscriptionItems.del(seatItemId, { proration_behavior })
    seatItemId = null
  }

  if (seatItemId && seats > 0) {
    await stripe.subscriptionItems.update(seatItemId, { quantity: seats, proration_behavior })
  } else if (!seatItemId && seats > 0) {
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
    data: {
      stripeSeatItemId: seatItemId,
      stripeSeatPriceId: seatItemId ? seatPriceId : null,
      billedSeats: seats,
    },
  })
  console.log('[billing] seats synced for company', companyId, '→', seats, 'extra seat(s)', priceMismatch ? '(price mismatch → recreated)' : '')
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

/**
 * Activate or deactivate a paid add-on for a company by creating/deleting the
 * corresponding Stripe subscription item, then syncing CompanyFeatureFlag.
 * Idempotent — safe to call repeatedly with the same target state.
 *
 * Billed on the same cycle as the company's main subscription (monthly/yearly),
 * mirroring syncSeatQuantity's proration strategy.
 *
 * Returns { requiresCheckout: true } if the company has no active Stripe
 * subscription yet (FREE / unpaid) — the caller must redirect to a Stripe
 * Checkout session instead (see /api/admin/addons/subscribe).
 */
export async function syncAddonSubscription(
  companyId: string,
  addon: AddonFlag,
  enable: boolean
): Promise<{ ok: boolean; requiresCheckout?: boolean }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { stripeSubscriptionId: true, stripeSubscriptionBillingCycle: true, plan: { select: { name: true } } },
  })

  if (company?.plan?.name?.toUpperCase() === 'ENTERPRISE') return { ok: true } // inclus, rien à facturer

  if (!company?.stripeSubscriptionId) return { ok: false, requiresCheckout: true }

  const cycle = company.stripeSubscriptionBillingCycle === 'yearly' ? 'yearly' : 'monthly'
  const priceId = STRIPE_ADDON_CONFIG[addon]?.[cycle]
  if (!priceId) {
    console.error('[billing] missing Stripe price id for addon', addon, cycle)
    return { ok: false }
  }

  const existingFlag = await prisma.companyFeatureFlag.findUnique({
    where: { companyId_flag: { companyId, flag: addon } },
  })

  const stripe = getStripe()
  const proration_behavior = cycle === 'yearly' ? 'always_invoice' : 'create_prorations'

  if (enable) {
    if (existingFlag?.enabled && existingFlag.stripeSubscriptionItemId) return { ok: true } // déjà actif

    let itemId = existingFlag?.stripeSubscriptionItemId ?? null
    if (!itemId) {
      const existing = await stripe.subscriptionItems.list({ subscription: company.stripeSubscriptionId })
      const found = existing.data.find(i => i.price.id === priceId)
      if (found) {
        itemId = found.id
      } else {
        const item = await stripe.subscriptionItems.create({
          subscription: company.stripeSubscriptionId,
          price: priceId,
          quantity: 1,
          proration_behavior,
        })
        itemId = item.id
      }
    }

    await prisma.companyFeatureFlag.upsert({
      where: { companyId_flag: { companyId, flag: addon } },
      create: { companyId, flag: addon, enabled: true, stripeSubscriptionItemId: itemId, stripePriceId: priceId, activatedAt: new Date() },
      update: { enabled: true, stripeSubscriptionItemId: itemId, stripePriceId: priceId, activatedAt: new Date() },
    })
  } else {
    if (existingFlag?.stripeSubscriptionItemId) {
      await stripe.subscriptionItems.del(existingFlag.stripeSubscriptionItemId, { proration_behavior })
    }
    await prisma.companyFeatureFlag.upsert({
      where: { companyId_flag: { companyId, flag: addon } },
      create: { companyId, flag: addon, enabled: false },
      update: { enabled: false, stripeSubscriptionItemId: null },
    })
  }

  return { ok: true }
}

/**
 * Fire-and-forget wrapper for syncAddonSubscription — use only for reactions
 * to Stripe webhook events, never in the self-service route (where the
 * caller needs to see the error, e.g. a declined card on immediate proration).
 */
export function syncAddonSubscriptionSafe(companyId: string, addon: AddonFlag, enable: boolean): void {
  syncAddonSubscription(companyId, addon, enable).catch(err =>
    console.error('[billing] addon sync failed', companyId, addon, err instanceof Error ? err.message : err)
  )
}
