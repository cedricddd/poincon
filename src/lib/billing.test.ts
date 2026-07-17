import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncSeatQuantity } from '@/lib/billing'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { getActiveMemberCount } from '@/lib/plan'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/plan', () => ({
  getActiveMemberCount: vi.fn(),
}))

vi.mock('@/lib/stripe', () => {
  const subscriptionItems = {
    create: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
    list: vi.fn(),
  }
  return {
    getStripe: () => ({ subscriptionItems }),
    STRIPE_PLAN_CONFIG: {
      STARTER: {
        baseIncludedSeats: 5,
        stripePriceIdExtraSeatMonthly: 'price_starter_seat_monthly',
        stripePriceIdExtraSeatYearly: 'price_starter_seat_yearly',
      },
      TEAM: {
        baseIncludedSeats: 15,
        stripePriceIdExtraSeatMonthly: 'price_team_seat_monthly',
        stripePriceIdExtraSeatYearly: 'price_team_seat_yearly',
      },
      ENTERPRISE: {
        baseIncludedSeats: -1,
        stripePriceIdExtraSeatMonthly: null,
        stripePriceIdExtraSeatYearly: null,
      },
      NOPRICE: {
        baseIncludedSeats: 5,
        stripePriceIdExtraSeatMonthly: null,
        stripePriceIdExtraSeatYearly: null,
      },
    },
  }
})

const findUnique = prisma.company.findUnique as ReturnType<typeof vi.fn>
const update = prisma.company.update as ReturnType<typeof vi.fn>
const activeMemberCount = getActiveMemberCount as ReturnType<typeof vi.fn>
const stripe = getStripe() as unknown as {
  subscriptionItems: {
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    del: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
  }
}

function mockCompany(overrides: Record<string, unknown> = {}) {
  findUnique.mockResolvedValue({
    stripeSubscriptionId: 'sub_123',
    stripeSeatItemId: null,
    stripeSeatPriceId: null,
    stripeSubscriptionBillingCycle: 'monthly',
    billedSeats: 0,
    plan: { name: 'STARTER' },
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stripe.subscriptionItems.list.mockResolvedValue({ data: [] })
})

describe('syncSeatQuantity — no-op guards', () => {
  it('does nothing when the company has no active Stripe subscription', async () => {
    findUnique.mockResolvedValue({ stripeSubscriptionId: null })

    await syncSeatQuantity('company_1')

    expect(activeMemberCount).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('does nothing for an unlimited/unknown plan (e.g. ENTERPRISE)', async () => {
    mockCompany({ plan: { name: 'ENTERPRISE' } })

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('does nothing and logs an error when the plan has no seat price id configured', async () => {
    mockCompany({ plan: { name: 'NOPRICE' } })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await syncSeatQuantity('company_1')

    expect(errorSpy).toHaveBeenCalled()
    expect(activeMemberCount).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('does nothing when billed seats already match the active member count', async () => {
    // STARTER includes 5 seats; 7 active members → 2 billable extra seats, already tracked
    mockCompany({ billedSeats: 2, stripeSeatItemId: 'si_existing', stripeSeatPriceId: 'price_starter_seat_monthly' })
    activeMemberCount.mockResolvedValue(7)

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.update).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.del).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('does nothing when nobody is over the included seats and no item exists yet', async () => {
    mockCompany({ billedSeats: 0, stripeSeatItemId: null })
    activeMemberCount.mockResolvedValue(3) // under the 5 included seats

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})

describe('syncSeatQuantity — add', () => {
  it('creates a new seat item when extra seats appear and none is tracked', async () => {
    mockCompany({ billedSeats: 0, stripeSeatItemId: null })
    activeMemberCount.mockResolvedValue(7) // 5 included + 2 extra
    stripe.subscriptionItems.create.mockResolvedValue({ id: 'si_new' })

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.create).toHaveBeenCalledWith({
      subscription: 'sub_123',
      price: 'price_starter_seat_monthly',
      quantity: 2,
      proration_behavior: 'create_prorations',
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'company_1' },
      data: { stripeSeatItemId: 'si_new', stripeSeatPriceId: 'price_starter_seat_monthly', billedSeats: 2 },
    })
  })

  it('reuses an existing Stripe item instead of duplicating it if the id was lost', async () => {
    mockCompany({ billedSeats: 0, stripeSeatItemId: null })
    activeMemberCount.mockResolvedValue(6) // 1 extra seat
    stripe.subscriptionItems.list.mockResolvedValue({
      data: [{ id: 'si_found', price: { id: 'price_starter_seat_monthly' } }],
    })

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.update).toHaveBeenCalledWith('si_found', {
      quantity: 1,
      proration_behavior: 'create_prorations',
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'company_1' },
      data: { stripeSeatItemId: 'si_found', stripeSeatPriceId: 'price_starter_seat_monthly', billedSeats: 1 },
    })
  })

  it('selects the yearly seat price and always_invoice proration for yearly subscriptions', async () => {
    mockCompany({
      billedSeats: 0,
      stripeSeatItemId: null,
      stripeSubscriptionBillingCycle: 'yearly',
      plan: { name: 'TEAM' },
    })
    activeMemberCount.mockResolvedValue(17) // 15 included + 2 extra
    stripe.subscriptionItems.create.mockResolvedValue({ id: 'si_new' })

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.create).toHaveBeenCalledWith({
      subscription: 'sub_123',
      price: 'price_team_seat_yearly',
      quantity: 2,
      proration_behavior: 'always_invoice',
    })
  })
})

describe('syncSeatQuantity — update', () => {
  it('updates the quantity on the existing item when extra seats change (price unchanged)', async () => {
    mockCompany({ billedSeats: 2, stripeSeatItemId: 'si_existing', stripeSeatPriceId: 'price_starter_seat_monthly' })
    activeMemberCount.mockResolvedValue(8) // 5 included + 3 extra (was 2)

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.update).toHaveBeenCalledWith('si_existing', {
      quantity: 3,
      proration_behavior: 'create_prorations',
    })
    expect(stripe.subscriptionItems.del).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({
      where: { id: 'company_1' },
      data: { stripeSeatItemId: 'si_existing', stripeSeatPriceId: 'price_starter_seat_monthly', billedSeats: 3 },
    })
  })
})

describe('syncSeatQuantity — remove', () => {
  it('deletes the seat item once headcount drops back to the included seats', async () => {
    mockCompany({ billedSeats: 2, stripeSeatItemId: 'si_existing', stripeSeatPriceId: 'price_starter_seat_monthly' })
    activeMemberCount.mockResolvedValue(5) // exactly the included seats → 0 extra

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.del).toHaveBeenCalledWith('si_existing', {
      proration_behavior: 'create_prorations',
    })
    expect(stripe.subscriptionItems.update).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({
      where: { id: 'company_1' },
      data: { stripeSeatItemId: null, stripeSeatPriceId: null, billedSeats: 0 },
    })
  })
})

describe('syncSeatQuantity — plan change (price mismatch)', () => {
  it('deletes the item on the old plan price and recreates it at the new plan price on STARTER→TEAM', async () => {
    // Company upgraded STARTER→TEAM: the seat item is still on the STARTER seat price,
    // and headcount (17) is now read against TEAM's 15 included seats → 2 extra seats.
    mockCompany({
      billedSeats: 2, // stale count from when it was priced under STARTER (7 members - 5 included)
      stripeSeatItemId: 'si_old_starter',
      stripeSeatPriceId: 'price_starter_seat_monthly',
      plan: { name: 'TEAM' },
    })
    activeMemberCount.mockResolvedValue(17) // 15 included (TEAM) + 2 extra
    stripe.subscriptionItems.create.mockResolvedValue({ id: 'si_new_team' })

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.del).toHaveBeenCalledWith('si_old_starter', {
      proration_behavior: 'create_prorations',
    })
    expect(stripe.subscriptionItems.create).toHaveBeenCalledWith({
      subscription: 'sub_123',
      price: 'price_team_seat_monthly',
      quantity: 2,
      proration_behavior: 'create_prorations',
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'company_1' },
      data: { stripeSeatItemId: 'si_new_team', stripeSeatPriceId: 'price_team_seat_monthly', billedSeats: 2 },
    })
  })

  it('reuses a matching Stripe item found by list() instead of creating a duplicate after the price mismatch delete', async () => {
    mockCompany({
      billedSeats: 2,
      stripeSeatItemId: 'si_old_starter',
      stripeSeatPriceId: 'price_starter_seat_monthly',
      plan: { name: 'TEAM' },
    })
    activeMemberCount.mockResolvedValue(16) // 15 included (TEAM) + 1 extra
    stripe.subscriptionItems.list.mockResolvedValue({
      data: [{ id: 'si_found_team', price: { id: 'price_team_seat_monthly' } }],
    })

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.del).toHaveBeenCalledWith('si_old_starter', {
      proration_behavior: 'create_prorations',
    })
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.update).toHaveBeenCalledWith('si_found_team', {
      quantity: 1,
      proration_behavior: 'create_prorations',
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'company_1' },
      data: { stripeSeatItemId: 'si_found_team', stripeSeatPriceId: 'price_team_seat_monthly', billedSeats: 1 },
    })
  })

  it('does not touch Stripe when the tracked price already matches the current plan', async () => {
    mockCompany({ billedSeats: 2, stripeSeatItemId: 'si_existing', stripeSeatPriceId: 'price_starter_seat_monthly' })
    activeMemberCount.mockResolvedValue(7) // unchanged: 5 included + 2 extra

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.del).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.update).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('does NOT delete a pre-existing item just because stripeSeatPriceId is not backfilled yet (deploy-day safety)', async () => {
    // Simulates every paid company right after the stripeSeatPriceId column is introduced:
    // a real seat item already exists in Stripe, but we've never recorded its price locally,
    // and nothing about the headcount actually changed. Must stay a pure no-op — a null
    // stripeSeatPriceId is "unknown", not "confirmed different", so it must never by itself
    // trigger a destructive delete+recreate against a real customer's live subscription.
    mockCompany({
      billedSeats: 2,
      stripeSeatItemId: 'si_existing',
      stripeSeatPriceId: null, // not backfilled yet
    })
    activeMemberCount.mockResolvedValue(7) // unchanged: 5 included + 2 extra → still 2 billable

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.del).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.update).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('backfills stripeSeatPriceId as a side effect once a real headcount change runs the full sync', async () => {
    // Same starting point as above, but headcount actually moved — the normal (non-mismatch)
    // quantity-update path runs and, as a side effect, finally records the price locally.
    mockCompany({
      billedSeats: 2,
      stripeSeatItemId: 'si_existing',
      stripeSeatPriceId: null,
    })
    activeMemberCount.mockResolvedValue(8) // 5 included + 3 extra (was 2)

    await syncSeatQuantity('company_1')

    expect(stripe.subscriptionItems.del).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled()
    expect(stripe.subscriptionItems.update).toHaveBeenCalledWith('si_existing', {
      quantity: 3,
      proration_behavior: 'create_prorations',
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'company_1' },
      data: { stripeSeatItemId: 'si_existing', stripeSeatPriceId: 'price_starter_seat_monthly', billedSeats: 3 },
    })
  })
})
