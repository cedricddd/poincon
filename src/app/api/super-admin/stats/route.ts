import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Companies (non-deleted only)
    const totalCompanies = await prisma.company.count({
      where: { deletedAt: null },
    })

    const activeCompanies = await prisma.company.count({
      where: {
        deletedAt: null,
        lastActivityAt: { gte: ninetyDaysAgo },
      },
    })

    const newCompaniesThisMonth = await prisma.company.count({
      where: {
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    const ghostCompanies = totalCompanies - activeCompanies

    // Active subscriptions from Stripe (approximation via DB)
    const companiesWithPlan = await prisma.company.count({
      where: {
        deletedAt: null,
        planId: { not: null },
        stripeSubscriptionId: { not: null },
      },
    })

    return NextResponse.json({
      totalCompanies,
      activeCompanies,
      ghostCompanies,
      newCompaniesThisMonth,
      companiesWithPlan,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('Super-admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
