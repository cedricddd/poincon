import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const company = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: {
      id: true, name: true, address: true, phone: true, vatNumber: true, contactEmail: true, logoUrl: true,
      stripeSubscriptionId: true, stripeSubscriptionBillingCycle: true,
      stripeCancelAtPeriodEnd: true, planExpiresAt: true,
      plan: { select: { name: true } },
    },
  })

  return NextResponse.json(company)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, address, phone, vatNumber, contactEmail } = body

  const company = await prisma.company.update({
    where: { id: auth.admin.companyId },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(vatNumber !== undefined && { vatNumber }),
      ...(contactEmail !== undefined && { contactEmail }),
    },
    select: { id: true, name: true, address: true, phone: true, vatNumber: true, contactEmail: true, logoUrl: true },
  })

  return NextResponse.json(company)
}
