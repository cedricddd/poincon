import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
    _stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
  }
  return _stripe
}

export const STRIPE_PRICES: Record<string, { monthly: string | null; yearly: string | null; amount_monthly: number; amount_yearly: number }> = {
  SOLO:       { monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY ?? null,       yearly: process.env.STRIPE_PRICE_SOLO_YEARLY ?? null,       amount_monthly: 4900,  amount_yearly: 47000  },
  TEAM:       { monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? null,       yearly: process.env.STRIPE_PRICE_TEAM_YEARLY ?? null,       amount_monthly: 9900,  amount_yearly: 95000  },
  ENTERPRISE: { monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? null, yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY ?? null, amount_monthly: 0,     amount_yearly: 0      },
}
