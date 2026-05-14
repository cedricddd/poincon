import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { planName, reason } = await req.json()
    if (!planName) {
      return NextResponse.json({ error: 'Missing planName' }, { status: 400 })
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
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

    // Update company plan
    const updated = await prisma.company.update({
      where: { id: params.id },
      data: { planId: newPlan.id },
      include: { plan: true, admin: { select: { email: true } } },
    })

    // Log plan change in history
    await prisma.planHistory.create({
      data: {
        companyId: params.id,
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
      resourceId: params.id,
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
