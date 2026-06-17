import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const resolveCompany = async (customerId: string) =>
    prisma.company.findFirst({ where: { stripeCustomerId: customerId } })

  const getPlanByName = async (name: string) =>
    prisma.plan.findUnique({ where: { name: name.toUpperCase() } })

  const getBillingCycle = (sub: any): string | null => {
    // Extract billing cycle from subscription items (monthly or yearly)
    if (sub.items?.data?.[0]?.price?.recurring?.interval) {
      const interval = sub.items.data[0].price.recurring.interval
      return interval === 'month' ? 'monthly' : interval === 'year' ? 'yearly' : null
    }
    return null
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      if (session.mode !== 'subscription') break

      const { userId, companyId, plan } = session.metadata ?? {}
      if (!companyId || !plan) break

      // Support legacy SOLO metadata (in case of old sessions)
      const resolvedPlan = plan === 'SOLO' ? 'STARTER' : plan
      const planRecord = await getPlanByName(resolvedPlan)
      // Get subscription to extract billing cycle
      const stripe = getStripe()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = await stripe.subscriptions.retrieve(session.subscription as string) as any
      const billingCycle = getBillingCycle(sub)

      await prisma.company.update({
        where: { id: companyId },
        data: {
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          stripeSubscriptionBillingCycle: billingCycle,
          stripeCurrentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : undefined,
          stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
          planId: planRecord?.id ?? undefined,
        },
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as any
      const company = await resolveCompany(sub.customer)
      if (!company) break

      const planName = sub.metadata?.plan?.toUpperCase()
      const planRecord = planName ? await getPlanByName(planName) : null
      const billingCycle = getBillingCycle(sub)

      await prisma.company.update({
        where: { id: company.id },
        data: {
          stripeSubscriptionId: sub.id,
          stripeSubscriptionBillingCycle: billingCycle,
          stripeCurrentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : undefined,
          stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
          stripeCancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          planExpiresAt: sub.status === 'active' ? null : new Date(sub.current_period_end * 1000),
          ...(planRecord ? { planId: planRecord.id } : {}),
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as any
      const company = await resolveCompany(sub.customer)
      if (!company) break

      const freePlan = await getPlanByName('FREE')
      await prisma.company.update({
        where: { id: company.id },
        data: {
          planId: freePlan?.id ?? null,
          stripeSubscriptionId: null,
          stripeSubscriptionBillingCycle: null,
          stripeCurrentPeriodStart: null,
          stripeCurrentPeriodEnd: null,
          stripeCancelAtPeriodEnd: false,
          planExpiresAt: null,
        },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
