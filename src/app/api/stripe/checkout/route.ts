import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    })
    if (!user?.companyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = req.nextUrl
    const plan = searchParams.get('plan')?.toUpperCase()
    const billing = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly'

    if (!plan || !['SOLO', 'TEAM', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }
    if (plan === 'ENTERPRISE') {
      return NextResponse.redirect(new URL('/contact', req.url))
    }

    const stripe = getStripe()
    const prices = STRIPE_PRICES[plan]
    const priceId = billing === 'yearly' ? prices.yearly : prices.monthly
    const amount = billing === 'yearly' ? prices.amount_yearly : prices.amount_monthly
    const interval = billing === 'yearly' ? 'year' : 'month'

    const company = user.companyId
      ? await prisma.company.findUnique({ where: { id: user.companyId }, select: { stripeCustomerId: true } })
      : null

    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: 'eur',
            product_data: { name: `Pointon ${plan}` },
            unit_amount: amount,
            recurring: { interval: interval as 'month' | 'year' },
          },
          quantity: 1,
        }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [lineItem],
      customer: company?.stripeCustomerId ?? undefined,
      metadata: { userId: session.user.id, companyId: user.companyId ?? '', plan },
      success_url: `${process.env.NEXTAUTH_URL}/admin/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    })

    return NextResponse.redirect(checkoutSession.url!)
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    if (error?.message?.includes('Invalid API Key')) {
      return NextResponse.json(
        { error: 'Stripe is not properly configured. Please add STRIPE_SECRET_KEY to your .env.local' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Checkout failed', detail: error?.message ?? String(error) }, { status: 500 })
  }
}
