import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const planFilter = searchParams.get('plan')
    const statusFilter = searchParams.get('status')

    const internalFilter = searchParams.get('internal')
    const where: any = { deletedAt: null }

    if (planFilter && planFilter !== 'ALL') {
      where.plan = { name: planFilter }
    }
    // By default hide internal accounts; pass ?internal=true to include them
    if (internalFilter !== 'true') {
      where.isInternal = false
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        admin: { select: { email: true, name: true } },
        plan: { select: { name: true, maxEmployees: true } },
        members: { where: { deletedAt: null } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Enrich with usage data
    const enriched = companies.map((company) => {
      const activeMembers = company.members.length
      const maxEmployees = company.plan?.maxEmployees ?? -1
      const isOverQuota = maxEmployees !== -1 && activeMembers > maxEmployees

      return {
        id: company.id,
        name: company.name,
        adminEmail: company.admin.email,
        adminName: company.admin.name,
        contactEmail: company.contactEmail,
        phone: company.phone,
        address: company.address,
        vatNumber: company.vatNumber,
        domain: company.domain,
        plan: company.plan?.name ?? 'FREE',
        billingCycle: company.stripeSubscriptionBillingCycle,
        isInternal: company.isInternal,
        isDemo: company.isDemo,
        activeMembers,
        maxEmployees,
        isOverQuota,
        lastActivityAt: company.lastActivityAt,
        createdAt: company.createdAt,
        planExpiresAt: company.planExpiresAt,
        enterprisePaidStatus: company.enterprisePaidStatus,
        enterprisePlanStartedAt: company.enterprisePlanStartedAt,
        stripeSubscriptionId: company.stripeSubscriptionId,
        stripeCurrentPeriodStart: company.stripeCurrentPeriodStart,
        stripeCurrentPeriodEnd: company.stripeCurrentPeriodEnd,
      }
    })

    // Apply status filter if specified
    let filtered = enriched
    if (statusFilter) {
      filtered = enriched.filter((c) => {
        if (statusFilter === 'OVER_QUOTA') return c.isOverQuota
        if (statusFilter === 'GHOST') {
          const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          return !c.lastActivityAt || c.lastActivityAt < ninetyDaysAgo
        }
        if (statusFilter === 'UNPAID') return !c.stripeSubscriptionId && c.plan !== 'FREE'
        return true
      })
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Super-admin accounts error:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { companyId } = await req.json()
    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: { deletedAt: new Date() },
    })

    await logAudit({
      userId: session.user.id,
      action: 'SUPER_ADMIN_DELETE_ACCOUNT',
      resource: 'Company',
      resourceId: companyId,
      changes: { action: 'soft_delete', name: company.name },
    })

    return NextResponse.json({ success: true, message: 'Account soft-deleted' })
  } catch (error) {
    console.error('Super-admin delete account error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
