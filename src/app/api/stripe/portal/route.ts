import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, companyId: true },
  })
  if (user?.role !== 'ADMIN' || !user.companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { stripeCustomerId: true },
  })
  if (!company?.stripeCustomerId) {
    return NextResponse.json({ error: 'Aucun abonnement actif' }, { status: 400 })
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/admin/dashboard`,
  })

  return NextResponse.redirect(portalSession.url)
}
