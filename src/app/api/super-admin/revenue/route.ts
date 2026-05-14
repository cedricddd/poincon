import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { STRIPE_PRICES } from '@/lib/stripe'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all active subscriptions
    const companies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        stripeSubscriptionId: { not: null },
        planId: { not: null },
      },
      include: {
        plan: { select: { name: true } },
      },
    })

    // Calculate MRR and ARR
    let mrrMonthly = 0 // Monthly subscriptions converted to monthly value
    let mrrYearly = 0 // Yearly subscriptions converted to monthly value (divided by 12)

    const monthlyCount = { SOLO: 0, TEAM: 0, ENTERPRISE: 0 }
    const yearlyCount = { SOLO: 0, TEAM: 0, ENTERPRISE: 0 }

    for (const company of companies) {
      const planName = company.plan?.name as 'SOLO' | 'TEAM' | 'ENTERPRISE'
      const billingCycle = company.stripeSubscriptionBillingCycle

      if (!planName || !STRIPE_PRICES[planName]) continue

      const prices = STRIPE_PRICES[planName]

      if (billingCycle === 'monthly') {
        const monthlyAmount = prices.amount_monthly / 100 // Convert cents to euros
        mrrMonthly += monthlyAmount
        monthlyCount[planName] = (monthlyCount[planName] || 0) + 1
      } else if (billingCycle === 'yearly') {
        const yearlyAmount = prices.amount_yearly / 100
        const monthlyEquivalent = yearlyAmount / 12
        mrrYearly += monthlyEquivalent
        yearlyCount[planName] = (yearlyCount[planName] || 0) + 1
      }
    }

    const mrrTotal = mrrMonthly + mrrYearly
    const arrTotal = mrrTotal * 12

    // Calculate 12-month history (approximation based on current state)
    const monthlyData = []
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now)
      date.setMonth(date.getMonth() - i)

      // This is a simplified estimation - in production you'd want to query historical data
      // For now we show the current MRR for all months (assumes steady state)
      monthlyData.push({
        month: date.toLocaleString('fr-BE', { month: 'short', year: '2-digit' }),
        mrr: mrrTotal,
        mrrMonthly,
        mrrYearly,
      })
    }

    return NextResponse.json({
      mrrTotal: Math.round(mrrTotal * 100) / 100,
      mrrMonthly: Math.round(mrrMonthly * 100) / 100,
      mrrYearly: Math.round(mrrYearly * 100) / 100,
      arrTotal: Math.round(arrTotal * 100) / 100,
      subscriptionCount: companies.length,
      monthlyBillingCount: Object.values(monthlyCount).reduce((a, b) => a + b, 0),
      yearlyBillingCount: Object.values(yearlyCount).reduce((a, b) => a + b, 0),
      byPlan: {
        monthly: monthlyCount,
        yearly: yearlyCount,
      },
      monthlyData,
    })
  } catch (error) {
    console.error('Super-admin revenue error:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 })
  }
}
