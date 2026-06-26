import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getStripe, STRIPE_PLAN_CONFIG } from '@/lib/stripe'
import { getActiveSeatsCount } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

const VALID_PLANS = ['STARTER', 'TEAM', 'BUSINESS', 'ENTERPRISE'] as const
type CheckoutPlan = typeof VALID_PLANS[number]

export async function GET(req: NextRequest) {
  try {
    let session
    try { session = await auth() } catch { /* stale JWT — treat as unauthenticated */ }
    if (!session?.user?.id) {
      const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
      const plan = req.nextUrl.searchParams.get('plan') ?? 'starter'
      const billing = req.nextUrl.searchParams.get('billing') ?? 'monthly'
      return NextResponse.redirect(`${base}/pricing/upgrade?plan=${plan}&billing=${billing}`)
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    })
    if (!user?.companyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = req.nextUrl
    const plan = searchParams.get('plan')?.toUpperCase() as CheckoutPlan | undefined
    const billing = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly'

    if (!plan || !(VALID_PLANS as readonly string[]).includes(plan)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }
    if (plan === 'ENTERPRISE') {
      return NextResponse.redirect(new URL('/contact', req.url))
    }

    const config = STRIPE_PLAN_CONFIG[plan]
    const stripe = getStripe()

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { stripeCustomerId: true },
    })

    // Count active seats and compute extra seats beyond included base
    const activeSeats = await getActiveSeatsCount(user.companyId)
    const extraSeats = Math.max(0, activeSeats - config.baseIncludedSeats)

    const isYearly = billing === 'yearly'
    const interval: 'month' | 'year' = isYearly ? 'year' : 'month'

    // Build line items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems: any[] = []

    // Base plan fee
    const basePriceId = isYearly ? config.stripePriceIdYearly : config.stripePriceIdMonthly
    const baseAmount = isYearly ? config.yearlyBaseCents : config.monthlyBaseCents

    lineItems.push(
      basePriceId
        ? { price: basePriceId, quantity: 1 }
        : {
            price_data: {
              currency: 'eur',
              product_data: { name: `Pointon ${plan}` },
              unit_amount: baseAmount,
              recurring: { interval },
            },
            quantity: 1,
          }
    )

    // Extra seats line item (only if needed)
    if (extraSeats > 0 && config.pricePerExtraSeatMonthlyCents > 0) {
      const seatPriceId = isYearly
        ? config.stripePriceIdExtraSeatYearly
        : config.stripePriceIdExtraSeatMonthly
      const seatUnitAmount = isYearly
        ? config.pricePerExtraSeatYearlyCents
        : config.pricePerExtraSeatMonthlyCents

      lineItems.push(
        seatPriceId
          ? { price: seatPriceId, quantity: extraSeats }
          : {
              price_data: {
                currency: 'eur',
                product_data: { name: `Siège supplémentaire ${plan}` },
                unit_amount: seatUnitAmount,
                recurring: { interval },
              },
              quantity: extraSeats,
            }
      )
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      customer: company?.stripeCustomerId ?? undefined,
      // Stripe Tax — TVA 21% belge automatique
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      customer_update: company?.stripeCustomerId ? { address: 'auto' } : undefined,
      tax_id_collection: { enabled: true },
      metadata: {
        userId: session.user.id,
        companyId: user.companyId,
        plan,
        billing,
        baseSeats: String(config.baseIncludedSeats),
        extraSeats: String(extraSeats),
      },
      success_url: `${process.env.NEXTAUTH_URL}/admin/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    })

    return NextResponse.redirect(checkoutSession.url!)
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    if (error?.message?.includes('Invalid API Key')) {
      return NextResponse.json(
        { error: 'Stripe is not properly configured.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
