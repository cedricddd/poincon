import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { isOdooConfigured, syncInvoiceToOdoo } from '@/lib/odoo'
import { NextRequest, NextResponse } from 'next/server'

// Parse Pointon's free-text company address into Odoo's structured fields.
// Expected format: "Rue de la Régence 45, 4000 Liège" (street, ZIP city).
// Falls back to putting the whole string in line1 if the pattern doesn't match.
function parseBelgianAddress(
  address: string | null | undefined
): { line1: string; city: string | null; postal_code: string | null; country: string } | null {
  if (!address?.trim()) return null
  const parts = address.split(',').map(p => p.trim()).filter(Boolean)
  const line1 = parts[0] ?? address.trim()
  let city: string | null = null
  let postal_code: string | null = null
  const tail = parts.slice(1).join(' ').trim()
  const m = tail.match(/(\d{4,5})\s+(.+)/)
  if (m) {
    postal_code = m[1]
    city = m[2].trim()
  } else if (tail) {
    city = tail
  }
  return { line1, city, postal_code, country: 'BE' }
}

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

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any
      if (!invoice.customer || !invoice.amount_paid || invoice.amount_paid <= 0) break

      let company = await resolveCompany(invoice.customer)
      // Fallback: first payment race condition — checkout.session.completed may not have
      // written stripeCustomerId yet, so try matching by subscriptionId
      if (!company && invoice.subscription) {
        company = await prisma.company.findFirst({
          where: { stripeSubscriptionId: invoice.subscription },
        }) ?? null
      }
      if (!company) break

      // Idempotency: skip only if already fully processed.
      // If the record exists but Odoo sync never completed (odooInvoiceId null),
      // allow a retry so a transient Odoo failure can be recovered on resend.
      const existing = await prisma.stripeInvoice.findUnique({
        where: { stripeInvoiceId: invoice.id },
      })
      if (existing && (existing.odooInvoiceId || !isOdooConfigured())) break

      // Resolve plan name and billing cycle from our DB
      const companyFull = await prisma.company.findUnique({
        where: { id: company.id },
        select: {
          name: true,
          vatNumber: true,
          address: true,
          phone: true,
          contactEmail: true,
          stripeSubscriptionBillingCycle: true,
          plan: { select: { name: true } },
        },
      })
      const planName = companyFull?.plan?.name ?? null
      const billingCycle = companyFull?.stripeSubscriptionBillingCycle ?? 'monthly'

      // Record in DB (reuse existing record on retry)
      const record = existing ?? await prisma.stripeInvoice.create({
        data: {
          stripeInvoiceId: invoice.id,
          companyId: company.id,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency ?? 'eur',
          plan: planName,
        },
      })

      // Sync to Odoo if configured (non-blocking: Stripe must always get 200)
      console.log('[webhook] invoice.payment_succeeded', invoice.id, 'odooConfigured=', isOdooConfigured())
      if (isOdooConfigured()) {
        try {
          // Pointon Company data is the authoritative source for billing identity.
          // Stripe's customer_name is just the cardholder (often the email) and its
          // address may be missing, so we prefer our own DB and fall back to Stripe.
          const stripeVat = invoice.customer_tax_ids?.[0]?.value ?? null
          const vatNumber = companyFull?.vatNumber ?? stripeVat ?? null
          const invoiceDate = new Date(invoice.created * 1000).toISOString().split('T')[0]
          // subtotal = HTVA (before tax, before credits)
          const amountHtva = invoice.subtotal ?? invoice.amount_paid
          // Tax: newer Stripe API exposes total_taxes[]; legacy used invoice.tax
          const taxAmount: number = Array.isArray(invoice.total_taxes)
            ? invoice.total_taxes.reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0)
            : (invoice.tax ?? 0)
          const billingAddress = parseBelgianAddress(companyFull?.address) ?? invoice.customer_address ?? null

          const odooId = await syncInvoiceToOdoo({
            stripeInvoiceId: invoice.id,
            customerEmail: companyFull?.contactEmail ?? invoice.customer_email ?? `company-${company.id}@pointon.be`,
            customerName: companyFull?.name ?? invoice.customer_name ?? 'Client Pointon',
            vatNumber,
            amountHtva,
            taxAmount,
            plan: planName ?? 'UNKNOWN',
            billingCycle,
            invoiceDate,
            billingAddress,
            customerPhone: companyFull?.phone ?? invoice.customer_phone ?? null,
          })

          await prisma.stripeInvoice.update({
            where: { id: record.id },
            data: { odooInvoiceId: odooId, odooSyncedAt: new Date() },
          })
          console.log('[webhook] Odoo sync OK for invoice', invoice.id, '-> odooId', odooId)
        } catch (err) {
          console.error('[webhook] Odoo sync FAILED for invoice', invoice.id, err instanceof Error ? err.message : err)
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
