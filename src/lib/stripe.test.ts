import { describe, it, expect, beforeAll } from 'vitest'

// STRIPE_PLAN_CONFIG reads price ids from env vars at module load time, so the
// fake ids must be set before importing '@/lib/stripe'.
let resolvePlanNameFromSubscription: typeof import('@/lib/stripe')['resolvePlanNameFromSubscription']

beforeAll(async () => {
  process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_starter_monthly'
  process.env.STRIPE_PRICE_STARTER_YEARLY = 'price_starter_yearly'
  process.env.STRIPE_PRICE_TEAM_MONTHLY = 'price_team_monthly'
  process.env.STRIPE_PRICE_TEAM_YEARLY = 'price_team_yearly'
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = 'price_business_monthly'
  process.env.STRIPE_PRICE_BUSINESS_YEARLY = 'price_business_yearly'
  process.env.STRIPE_PRICE_STARTER_SEAT_MONTHLY = 'price_starter_seat_monthly'

  const mod = await import('@/lib/stripe')
  resolvePlanNameFromSubscription = mod.resolvePlanNameFromSubscription
})

function sub(priceIds: (string | null | undefined)[]) {
  return { items: { data: priceIds.map(id => ({ price: { id } })) } }
}

describe('resolvePlanNameFromSubscription', () => {
  it('matches the monthly base price', () => {
    expect(resolvePlanNameFromSubscription(sub(['price_starter_monthly']))).toBe('STARTER')
  })

  it('matches the yearly base price', () => {
    expect(resolvePlanNameFromSubscription(sub(['price_team_yearly']))).toBe('TEAM')
  })

  it('ignores non-base line items (seats, add-ons) and still finds the base plan', () => {
    expect(
      resolvePlanNameFromSubscription(sub(['price_starter_seat_monthly', 'price_business_monthly']))
    ).toBe('BUSINESS')
  })

  it('returns null when no line item matches a known base plan price', () => {
    expect(resolvePlanNameFromSubscription(sub(['price_starter_seat_monthly']))).toBeNull()
    expect(resolvePlanNameFromSubscription(sub([]))).toBeNull()
  })

  it('returns null when items are missing entirely', () => {
    expect(resolvePlanNameFromSubscription({})).toBeNull()
    expect(resolvePlanNameFromSubscription({ items: { data: null } })).toBeNull()
  })
})
