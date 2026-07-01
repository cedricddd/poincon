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

// Base prices in euro cents (HTVA)
// Annual = 10 months (2 months free = ~-17%), paid upfront
export const STRIPE_PLAN_CONFIG: Record<string, {
  monthlyBaseCents: number
  yearlyBaseCents: number   // upfront annual (10 months)
  pricePerExtraSeatMonthlyCents: number
  pricePerExtraSeatYearlyCents: number
  baseIncludedSeats: number
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  stripePriceIdExtraSeatMonthly: string | null
  stripePriceIdExtraSeatYearly: string | null
}> = {
  STARTER: {
    monthlyBaseCents: 1990,               // 19,90€/mois
    yearlyBaseCents: 19900,               // 199€/an (10 mois)
    pricePerExtraSeatMonthlyCents: 290,   // +2,90€/siège/mois
    pricePerExtraSeatYearlyCents: 2900,   // +29€/siège/an (10 mois)
    baseIncludedSeats: 5,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_STARTER_YEARLY ?? null,
    stripePriceIdExtraSeatMonthly: process.env.STRIPE_PRICE_STARTER_SEAT_MONTHLY ?? null,
    stripePriceIdExtraSeatYearly: process.env.STRIPE_PRICE_STARTER_SEAT_YEARLY ?? null,
  },
  TEAM: {
    monthlyBaseCents: 4490,               // 44,90€/mois
    yearlyBaseCents: 44900,               // 449€/an
    pricePerExtraSeatMonthlyCents: 260,
    pricePerExtraSeatYearlyCents: 2600,
    baseIncludedSeats: 15,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_TEAM_YEARLY ?? null,
    stripePriceIdExtraSeatMonthly: process.env.STRIPE_PRICE_TEAM_SEAT_MONTHLY ?? null,
    stripePriceIdExtraSeatYearly: process.env.STRIPE_PRICE_TEAM_SEAT_YEARLY ?? null,
  },
  BUSINESS: {
    monthlyBaseCents: 6990,               // 69,90€/mois
    yearlyBaseCents: 69900,               // 699€/an
    pricePerExtraSeatMonthlyCents: 220,
    pricePerExtraSeatYearlyCents: 2200,
    baseIncludedSeats: 30,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY ?? null,
    stripePriceIdExtraSeatMonthly: process.env.STRIPE_PRICE_BUSINESS_SEAT_MONTHLY ?? null,
    stripePriceIdExtraSeatYearly: process.env.STRIPE_PRICE_BUSINESS_SEAT_YEARLY ?? null,
  },
  ENTERPRISE: {
    monthlyBaseCents: 0,
    yearlyBaseCents: 0,
    pricePerExtraSeatMonthlyCents: 0,
    pricePerExtraSeatYearlyCents: 0,
    baseIncludedSeats: -1,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    stripePriceIdExtraSeatMonthly: null,
    stripePriceIdExtraSeatYearly: null,
  },
}

// Legacy alias — used by existing webhook code
export const STRIPE_PRICES = STRIPE_PLAN_CONFIG

// Add-on pricing (HTVA, cents). Kept in sync with ADDON_INFO.price in src/lib/plan.ts —
// that file is the human-facing display source, this one is the Stripe billing source.
export const STRIPE_ADDON_CONFIG: Record<string, {
  priceCents: number
  monthly: string | null
  yearly: string | null
}> = {
  addon_api_access: {
    priceCents: 2900,
    monthly: process.env.STRIPE_PRICE_ADDON_API_ACCESS_MONTHLY ?? null,
    yearly: process.env.STRIPE_PRICE_ADDON_API_ACCESS_YEARLY ?? null,
  },
  addon_webhooks: {
    priceCents: 1900,
    monthly: process.env.STRIPE_PRICE_ADDON_WEBHOOKS_MONTHLY ?? null,
    yearly: process.env.STRIPE_PRICE_ADDON_WEBHOOKS_YEARLY ?? null,
  },
  addon_kiosk_advanced: {
    priceCents: 1900,
    monthly: process.env.STRIPE_PRICE_ADDON_KIOSK_ADVANCED_MONTHLY ?? null,
    yearly: process.env.STRIPE_PRICE_ADDON_KIOSK_ADVANCED_YEARLY ?? null,
  },
  addon_rgpd_export: {
    priceCents: 1500,
    monthly: process.env.STRIPE_PRICE_ADDON_RGPD_EXPORT_MONTHLY ?? null,
    yearly: process.env.STRIPE_PRICE_ADDON_RGPD_EXPORT_YEARLY ?? null,
  },
  addon_custom_reports: {
    priceCents: 1500,
    monthly: process.env.STRIPE_PRICE_ADDON_CUSTOM_REPORTS_MONTHLY ?? null,
    yearly: process.env.STRIPE_PRICE_ADDON_CUSTOM_REPORTS_YEARLY ?? null,
  },
}
