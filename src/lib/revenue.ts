import type { Prisma } from '@prisma/client'
import { STRIPE_PRICES } from '@/lib/stripe'

/** Fields needed to value one company's subscription or offline contract. */
export interface RevenueCompany {
  planName: string | null
  stripeSubscriptionId: string | null
  stripeSubscriptionBillingCycle: string | null
  enterprisePaidStatus: string | null
  enterpriseAnnualCents: number | null
  enterprisePlanStartedAt: Date | null
  planExpiresAt: Date | null
}

export interface RevenueMonth {
  month: string
  mrr: number
  mrrMonthly: number
  mrrYearly: number
  mrrContracts: number
}

export interface RevenueSummary {
  mrrTotal: number
  mrrMonthly: number
  mrrYearly: number
  mrrContracts: number
  arrTotal: number
  monthlyBillingCount: number
  yearlyBillingCount: number
  contractCount: number
  byPlan: { monthly: Record<string, number>; yearly: Record<string, number> }
  monthlyData: RevenueMonth[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Offline (Odoo + bank transfer) Enterprise contract value per month, or 0 when it
 * must not count: not PAID, no amount, or no overlap with [from, to).
 * A contract without start date counts from the beginning; without end date, forever.
 */
function contractMonthlyValue(c: RevenueCompany, from: Date, to: Date): number {
  if (c.planName !== 'ENTERPRISE' || c.stripeSubscriptionId) return 0
  if (c.enterprisePaidStatus !== 'PAID' || !c.enterpriseAnnualCents || c.enterpriseAnnualCents <= 0) return 0
  if (c.enterprisePlanStartedAt && c.enterprisePlanStartedAt >= to) return 0
  if (c.planExpiresAt && c.planExpiresAt <= from) return 0
  return c.enterpriseAnnualCents / 100 / 12
}

/**
 * MRR/ARR from Stripe subscriptions (list price, seats excluded) plus PAID offline
 * Enterprise contracts. Stripe keeps no subscription history here, so past months
 * of `monthlyData` only include offline contracts (their dates are known); Stripe
 * subscriptions appear from the current month on.
 */
export function computeRevenue(companies: RevenueCompany[], now: Date = new Date()): RevenueSummary {
  let mrrMonthly = 0
  let mrrYearly = 0
  let mrrContracts = 0
  let contractCount = 0
  const monthly: Record<string, number> = {}
  const yearly: Record<string, number> = {}

  for (const c of companies) {
    const prices = c.planName ? STRIPE_PRICES[c.planName] : undefined
    if (c.stripeSubscriptionId && prices) {
      if (c.stripeSubscriptionBillingCycle === 'monthly') {
        mrrMonthly += prices.monthlyBaseCents / 100
        monthly[c.planName!] = (monthly[c.planName!] ?? 0) + 1
      } else if (c.stripeSubscriptionBillingCycle === 'yearly') {
        mrrYearly += prices.yearlyBaseCents / 100 / 12
        yearly[c.planName!] = (yearly[c.planName!] ?? 0) + 1
      }
      continue
    }
    // Active "now" = the instant itself, as a 1 ms window.
    const value = contractMonthlyValue(c, now, new Date(now.getTime() + 1))
    if (value > 0) {
      mrrContracts += value
      contractCount++
    }
  }

  const monthlyData: RevenueMonth[] = Array.from({ length: 12 }, (_, i) => {
    const offset = 11 - i
    const from = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const to = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1)
    const contracts = companies.reduce((sum, c) => sum + contractMonthlyValue(c, from, to), 0)
    const isCurrent = offset === 0
    const m = isCurrent ? mrrMonthly : 0
    const y = isCurrent ? mrrYearly : 0
    return {
      month: from.toLocaleString('fr-BE', { month: 'short', year: '2-digit' }),
      mrr: round2(m + y + contracts),
      mrrMonthly: round2(m),
      mrrYearly: round2(y),
      mrrContracts: round2(contracts),
    }
  })

  const mrrTotal = mrrMonthly + mrrYearly + mrrContracts
  const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

  return {
    mrrTotal: round2(mrrTotal),
    mrrMonthly: round2(mrrMonthly),
    mrrYearly: round2(mrrYearly),
    mrrContracts: round2(mrrContracts),
    arrTotal: round2(mrrTotal * 12),
    monthlyBillingCount: sum(monthly),
    yearlyBillingCount: sum(yearly),
    contractCount,
    byPlan: { monthly, yearly },
    monthlyData,
  }
}

/** Prisma `where`/`select` for the companies `computeRevenue` needs. */
export const revenueCompanyQuery = {
  where: {
    deletedAt: null,
    isInternal: false,
    planId: { not: null },
    OR: [
      { stripeSubscriptionId: { not: null } },
      { enterprisePaidStatus: 'PAID', enterpriseAnnualCents: { gt: 0 } },
    ],
  },
  select: {
    stripeSubscriptionId: true,
    stripeSubscriptionBillingCycle: true,
    enterprisePaidStatus: true,
    enterpriseAnnualCents: true,
    enterprisePlanStartedAt: true,
    planExpiresAt: true,
    plan: { select: { name: true } },
  },
} satisfies Prisma.CompanyFindManyArgs

export function toRevenueCompany(c: {
  stripeSubscriptionId: string | null
  stripeSubscriptionBillingCycle: string | null
  enterprisePaidStatus: string | null
  enterpriseAnnualCents: number | null
  enterprisePlanStartedAt: Date | null
  planExpiresAt: Date | null
  plan: { name: string } | null
}): RevenueCompany {
  const { plan, ...rest } = c
  return { ...rest, planName: plan?.name ?? null }
}
