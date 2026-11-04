import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { computeRevenue, revenueCompanyQuery, toRevenueCompany } from '@/lib/revenue'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Stripe subscriptions + PAID offline Enterprise contracts (internal/test accounts excluded)
    const companies = await prisma.company.findMany(revenueCompanyQuery)
    const revenue = computeRevenue(companies.map(toRevenueCompany))

    return NextResponse.json({ ...revenue, subscriptionCount: companies.length })
  } catch (error) {
    console.error('Super-admin revenue error:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 })
  }
}
