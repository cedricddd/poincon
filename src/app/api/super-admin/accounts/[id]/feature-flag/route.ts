import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const flags = await prisma.companyFeatureFlag.findMany({
    where: { companyId: id },
    select: { id: true, flag: true, enabled: true },
  })
  return NextResponse.json(flags)
}

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

    const { flag, enabled } = await req.json()
    if (!flag || enabled === undefined) {
      return NextResponse.json({ error: 'Missing flag or enabled' }, { status: 400 })
    }

    const company = await prisma.company.findUnique({
      where: { id },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const featureFlag = await prisma.companyFeatureFlag.upsert({
      where: { companyId_flag: { companyId: id, flag } },
      update: { enabled },
      create: { companyId: id, flag, enabled },
    })

    await logAudit({
      userId: session.user.id,
      action: 'SUPER_ADMIN_TOGGLE_FEATURE',
      resource: 'CompanyFeatureFlag',
      resourceId: featureFlag.id,
      changes: { flag, enabled, companyId: id, companyName: company.name },
    })

    return NextResponse.json(featureFlag)
  } catch (error) {
    console.error('Super-admin feature flag error:', error)
    return NextResponse.json({ error: 'Failed to toggle feature flag' }, { status: 500 })
  }
}
