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
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const baseWhere = { deletedAt: null, isInternal: false }

    // Companies (non-deleted, non-internal only)
    const totalCompanies = await prisma.company.count({
      where: baseWhere,
    })

    const activeCompanies = await prisma.company.count({
      where: {
        ...baseWhere,
        lastActivityAt: { gte: ninetyDaysAgo },
      },
    })

    const newCompaniesThisMonth = await prisma.company.count({
      where: {
        ...baseWhere,
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    const ghostCompanies = totalCompanies - activeCompanies

    // Active subscriptions from Stripe (approximation via DB)
    const companiesWithPlan = await prisma.company.count({
      where: {
        ...baseWhere,
        planId: { not: null },
        stripeSubscriptionId: { not: null },
      },
    })

    // Users (from non-internal companies only)
    const internalCompanyIds = (await prisma.company.findMany({
      where: { isInternal: true },
      select: { id: true },
    })).map(c => c.id)

    const userWhere = {
      deletedAt: null,
      ...(internalCompanyIds.length > 0 && { companyId: { notIn: internalCompanyIds } }),
    }

    const totalUsers = await prisma.user.count({ where: userWhere })

    const activeUsers7d = await prisma.user.count({
      where: { ...userWhere, clockRecords: { some: { clockIn: { gte: sevenDaysAgo } } } },
    })

    const activeUsers30d = await prisma.user.count({
      where: { ...userWhere, clockRecords: { some: { clockIn: { gte: thirtyDaysAgo } } } },
    })

    // Churn: paying companies with cancel scheduled / total paying companies
    const churningCompanies = await prisma.company.count({
      where: {
        ...baseWhere,
        stripeSubscriptionId: { not: null },
        stripeCancelAtPeriodEnd: true,
      },
    })

    const churnRate = companiesWithPlan > 0
      ? Math.round((churningCompanies / companiesWithPlan) * 100)
      : 0

    return NextResponse.json({
      totalCompanies,
      activeCompanies,
      ghostCompanies,
      newCompaniesThisMonth,
      companiesWithPlan,
      totalUsers,
      activeUsers7d,
      activeUsers30d,
      churningCompanies,
      churnRate,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('Super-admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
