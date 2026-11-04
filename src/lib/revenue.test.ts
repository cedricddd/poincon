import { describe, it, expect } from 'vitest'
import { computeRevenue, type RevenueCompany } from './revenue'

const base: RevenueCompany = {
  planName: null,
  stripeSubscriptionId: null,
  stripeSubscriptionBillingCycle: null,
  enterprisePaidStatus: null,
  enterpriseAnnualCents: null,
  enterprisePlanStartedAt: null,
  planExpiresAt: null,
}

const contract = (over: Partial<RevenueCompany> = {}): RevenueCompany => ({
  ...base,
  planName: 'ENTERPRISE',
  enterprisePaidStatus: 'PAID',
  enterpriseAnnualCents: 19900,
  enterprisePlanStartedAt: new Date(2026, 9, 5),
  planExpiresAt: new Date(2027, 9, 5),
  ...over,
})

const NOW = new Date(2026, 10, 4, 12)

describe('computeRevenue', () => {
  it('counts a PAID offline Enterprise contract in MRR and ARR', () => {
    const r = computeRevenue([contract()], NOW)
    expect(r.mrrContracts).toBe(16.58)
    expect(r.mrrTotal).toBe(16.58)
    expect(r.arrTotal).toBe(199)
    expect(r.contractCount).toBe(1)
  })

  it('ignores contracts that are unpaid, without amount, expired or not started', () => {
    const r = computeRevenue([
      contract({ enterprisePaidStatus: 'UNPAID' }),
      contract({ enterprisePaidStatus: 'PENDING' }),
      contract({ enterpriseAnnualCents: null }),
      contract({ enterpriseAnnualCents: 0 }),
      contract({ planExpiresAt: new Date(2026, 10, 1) }),
      contract({ enterprisePlanStartedAt: new Date(2026, 11, 1) }),
      contract({ planName: 'STARTER' }),
    ], NOW)
    expect(r.mrrTotal).toBe(0)
    expect(r.contractCount).toBe(0)
  })

  it('values Stripe subscriptions at list price and does not double-count them as contracts', () => {
    const r = computeRevenue([
      { ...base, planName: 'STARTER', stripeSubscriptionId: 'sub_1', stripeSubscriptionBillingCycle: 'monthly' },
      { ...base, planName: 'TEAM', stripeSubscriptionId: 'sub_2', stripeSubscriptionBillingCycle: 'yearly' },
      contract({ stripeSubscriptionId: 'sub_3', stripeSubscriptionBillingCycle: 'yearly' }),
    ], NOW)
    expect(r.mrrMonthly).toBe(19.9)
    expect(r.mrrYearly).toBe(37.42)
    expect(r.mrrContracts).toBe(0)
    expect(r.monthlyBillingCount).toBe(1)
    expect(r.yearlyBillingCount).toBe(2)
  })

  it('builds history from contract dates, Stripe only in the current month', () => {
    const r = computeRevenue([
      contract(),
      { ...base, planName: 'STARTER', stripeSubscriptionId: 'sub_1', stripeSubscriptionBillingCycle: 'monthly' },
    ], NOW)
    expect(r.monthlyData).toHaveLength(12)
    const bars = r.monthlyData.map(d => d.mrr)
    // Dec 2025 … Sep 2026: nothing; Oct 2026: contract starts on the 5th; Nov 2026: contract + Stripe.
    expect(bars.slice(0, 10)).toEqual(Array(10).fill(0))
    expect(bars[10]).toBe(16.58)
    expect(bars[11]).toBe(36.48)
  })
})
