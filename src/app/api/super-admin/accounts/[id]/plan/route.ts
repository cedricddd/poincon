import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { syncSeatQuantitySafe } from '@/lib/billing'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { planName, reason, enterprisePaidStatus, enterprisePlanStartedAt, planExpiresAt } = await req.json()
    if (!planName) {
      return NextResponse.json({ error: 'Missing planName' }, { status: 400 })
    }

    const company = await prisma.company.findUnique({
      where: { id },
      include: { plan: true },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const newPlan = await prisma.plan.findUnique({
      where: { name: planName.toUpperCase() },
    })

    if (!newPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const oldPlanName = company.plan?.name ?? 'FREE'

    const isEnterprise = planName.toUpperCase() === 'ENTERPRISE'
    const enterpriseData: any = {}
    if (isEnterprise) {
      if (enterprisePaidStatus) enterpriseData.enterprisePaidStatus = enterprisePaidStatus
      if (enterprisePlanStartedAt) enterpriseData.enterprisePlanStartedAt = new Date(enterprisePlanStartedAt)
      if (planExpiresAt) enterpriseData.planExpiresAt = new Date(planExpiresAt)
      // Auto-set start date if not provided and plan is changing to Enterprise
      if (!enterprisePlanStartedAt && company.plan?.name !== 'ENTERPRISE') {
        enterpriseData.enterprisePlanStartedAt = new Date()
      }
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { planId: newPlan.id, ...enterpriseData },
      include: { plan: true, admin: { select: { email: true } } },
    })

    // Si la company a une souscription Stripe active, l'item siège doit refléter
    // le nouveau plan (price différent) — no-op sinon (FREE/Enterprise/pas d'abonnement).
    syncSeatQuantitySafe(id)

    await prisma.planHistory.create({
      data: {
        companyId: id,
        fromPlan: oldPlanName,
        toPlan: planName.toUpperCase(),
        changedBy: 'SUPER_ADMIN',
        reason: reason || `Plan changed by super-admin`,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'SUPER_ADMIN_CHANGE_PLAN',
      resource: 'Company',
      resourceId: id,
      changes: {
        fromPlan: oldPlanName,
        toPlan: newPlan.name,
        reason,
        companyName: company.name,
        adminEmail: updated.admin?.email,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Super-admin plan change error:', error)
    return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 })
  }
}
