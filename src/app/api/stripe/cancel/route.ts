import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { NextResponse } from 'next/server'

export async function POST() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const company = await prisma.company.findUnique({
    where: { id: auth.admin.companyId! },
    select: { stripeSubscriptionId: true, stripeCancelAtPeriodEnd: true },
  })

  if (!company?.stripeSubscriptionId) {
    return NextResponse.json({ error: 'Aucun abonnement actif' }, { status: 400 })
  }
  if (company.stripeCancelAtPeriodEnd) {
    return NextResponse.json({ error: 'Résiliation déjà programmée' }, { status: 400 })
  }

  await getStripe().subscriptions.update(company.stripeSubscriptionId, {
    cancel_at_period_end: true,
  })

  await prisma.company.update({
    where: { id: auth.admin.companyId! },
    data: { stripeCancelAtPeriodEnd: true },
  })

  return NextResponse.json({ ok: true })
}
