import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { getActiveMemberCount } from '@/lib/plan'
import { STRIPE_PLAN_CONFIG } from '@/lib/stripe'

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const company = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: {
      id: true, name: true, domain: true, address: true, phone: true, vatNumber: true, contactEmail: true, logoUrl: true,
      stripeSubscriptionId: true, stripeSubscriptionBillingCycle: true,
      stripeCancelAtPeriodEnd: true, planExpiresAt: true,
      plan: { select: { name: true } },
    },
  })

  // Seat usage: active members vs included seats, and the extra-seat cost.
  // Only meaningful on billable plans (STARTER/TEAM/BUSINESS).
  let seatUsage = null
  const planName = company?.plan?.name?.toUpperCase()
  const cfg = planName ? STRIPE_PLAN_CONFIG[planName] : undefined
  if (company && cfg && cfg.baseIncludedSeats >= 0) {
    const activeMembers = await getActiveMemberCount(company.id)
    const includedSeats = cfg.baseIncludedSeats
    const extraSeats = Math.max(0, activeMembers - includedSeats)
    const isYearly = company.stripeSubscriptionBillingCycle === 'yearly'
    const pricePerSeatCents = isYearly ? cfg.pricePerExtraSeatYearlyCents : cfg.pricePerExtraSeatMonthlyCents
    seatUsage = {
      activeMembers,
      includedSeats,
      extraSeats,
      pricePerSeatCents,
      extraCostCents: extraSeats * pricePerSeatCents,
      cycle: isYearly ? 'yearly' : 'monthly',
    }
  }

  return NextResponse.json({ ...company, seatUsage })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, domain, address, phone, vatNumber, contactEmail } = body

  const company = await prisma.company.update({
    where: { id: auth.admin.companyId },
    data: {
      ...(name !== undefined && { name }),
      ...(domain !== undefined && { domain: domain || null }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(vatNumber !== undefined && { vatNumber }),
      ...(contactEmail !== undefined && { contactEmail }),
    },
    select: { id: true, name: true, domain: true, address: true, phone: true, vatNumber: true, contactEmail: true, logoUrl: true },
  })

  return NextResponse.json(company)
}
