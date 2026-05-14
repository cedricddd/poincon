import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

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

    const { contactEmail, marketingConsent } = await req.json()

    const company = await prisma.company.findUnique({
      where: { id },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(contactEmail && { contactEmail }),
        ...(marketingConsent !== undefined && { marketingConsent }),
      },
      include: { admin: { select: { email: true } } },
    })

    await logAudit({
      userId: session.user.id,
      action: 'SUPER_ADMIN_UPDATE_CONTACT',
      resource: 'Company',
      resourceId: id,
      changes: {
        contactEmail: contactEmail || company.contactEmail,
        marketingConsent: marketingConsent ?? company.marketingConsent,
        companyName: company.name,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Super-admin contact update error:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}
