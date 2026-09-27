import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getCompanyPlan(auth.admin.companyId)
  const company = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: { qrAccountOnly: true },
  })
  return NextResponse.json({
    hasAccess: planCanAccess(plan, 'kiosk'),
    qrAccountOnly: company?.qrAccountOnly ?? false,
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getCompanyPlan(auth.admin.companyId)
  if (!planCanAccess(plan, 'kiosk')) return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })

  const body = await req.json()
  if (typeof body.qrAccountOnly !== 'boolean') {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const before = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: { qrAccountOnly: true },
  })

  const company = await prisma.company.update({
    where: { id: auth.admin.companyId },
    data: { qrAccountOnly: body.qrAccountOnly },
    select: { qrAccountOnly: true },
  })

  await logAudit({
    userId: auth.admin.id,
    action: 'settings_change',
    resource: 'company',
    resourceId: auth.admin.companyId,
    changes: { before, after: company },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json(company)
}
