import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { companyHasAddon } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const company = await prisma.company.findUnique({
    where: { id: auth.admin.companyId },
    select: { auditLogRetentionYears: true },
  })
  const hasAddon = await companyHasAddon(auth.admin.companyId, 'addon_rgpd_export')

  return NextResponse.json({ auditLogRetentionYears: company?.auditLogRetentionYears ?? 3, hasAddon })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  if (!await companyHasAddon(auth.admin.companyId, 'addon_rgpd_export')) {
    return NextResponse.json({ error: 'Add-on Export RGPD requis' }, { status: 403 })
  }

  const { years } = await req.json()
  const parsed = Number(years)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    return NextResponse.json({ error: 'La rétention doit être un entier entre 1 et 10 ans' }, { status: 400 })
  }

  await prisma.company.update({
    where: { id: auth.admin.companyId },
    data: { auditLogRetentionYears: parsed },
  })

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: 'admin_update',
      resource: 'Company',
      resourceId: auth.admin.companyId,
      changes: JSON.stringify({ auditLogRetentionYears: parsed }),
    },
  })

  return NextResponse.json({ auditLogRetentionYears: parsed })
}
