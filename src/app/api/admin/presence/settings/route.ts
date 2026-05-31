import { NextRequest, NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { getPresenceAccess } from '@/lib/plan'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const access = await getPresenceAccess(auth.admin.companyId)
  return NextResponse.json(access)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { hasAccess } = await getPresenceAccess(auth.admin.companyId)
  if (!hasAccess) return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })

  const body = await req.json()
  const data: Record<string, boolean> = {}
  if (typeof body.presenceForManagers === 'boolean') data.presenceForManagers = body.presenceForManagers
  if (typeof body.presenceForEmployees === 'boolean') data.presenceForEmployees = body.presenceForEmployees
  if (typeof body.mealBreakEnabled === 'boolean') data.mealBreakEnabled = body.mealBreakEnabled

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })

  const before = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: { presenceForManagers: true, presenceForEmployees: true, mealBreakEnabled: true },
  })

  const company = await prisma.company.update({
    where: { id: auth.admin.companyId },
    data,
    select: { presenceForManagers: true, presenceForEmployees: true, mealBreakEnabled: true },
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
