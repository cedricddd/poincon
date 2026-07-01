import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { ADDON_FLAGS, ADDON_INFO, type AddonFlag } from '@/lib/plan'
import { STRIPE_ADDON_CONFIG, getStripe } from '@/lib/stripe'
import { syncAddonSubscription } from '@/lib/billing'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return isAdminRole(user?.role) ? session : null
}

async function getCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
  if (user?.companyId) return user.companyId
  const company = await prisma.company.findFirst({ where: { adminId: userId }, select: { id: true } })
  return company?.id ?? null
}

// POST — self-service activation/désactivation d'un add-on par un admin de company.
// Distinct de POST /api/admin/addons (réservé SUPER_ADMIN, override manuel/support).
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = await getCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { flag, enable } = await req.json()
  if (!ADDON_FLAGS.includes(flag as AddonFlag)) {
    return NextResponse.json({ error: 'flag invalide' }, { status: 400 })
  }

  const result = await syncAddonSubscription(companyId, flag as AddonFlag, enable !== false)

  if (result.requiresCheckout) {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { stripeCustomerId: true, stripeSubscriptionBillingCycle: true } })
    const cycle = company?.stripeSubscriptionBillingCycle === 'yearly' ? 'yearly' : 'monthly'
    const priceId = STRIPE_ADDON_CONFIG[flag as AddonFlag]?.[cycle]
    if (!priceId) return NextResponse.json({ error: 'Add-on non disponible pour le moment' }, { status: 503 })

    const stripe = getStripe()
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: company?.stripeCustomerId ?? undefined,
      metadata: { companyId, addonFlag: flag, kind: 'addon' },
      success_url: `${process.env.NEXTAUTH_URL}/admin/dashboard/settings/integrations?addon=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/admin/dashboard/settings/integrations`,
    })
    return NextResponse.json({ checkoutUrl: checkoutSession.url })
  }

  if (!result.ok) {
    return NextResponse.json({ error: `Échec de synchronisation pour ${ADDON_INFO[flag as AddonFlag]?.name ?? flag}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
