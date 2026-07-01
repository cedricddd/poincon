import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { companyHasAddon } from '@/lib/plan'
import { NextResponse } from 'next/server'

// Export RGPD (Art. 20 — portabilité) de toutes les données de la company.
// Réservé à l'addon_rgpd_export. Anonymisation uniquement ailleurs — cette route
// exporte, elle ne supprime ni n'anonymise rien.
export async function GET() {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  if (!await companyHasAddon(auth.admin.companyId, 'addon_rgpd_export')) {
    return NextResponse.json({ error: 'Add-on Export RGPD requis' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { companyId: auth.admin.companyId, deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  const payload = await Promise.all(users.map(async (user) => {
    const [clockRecords, timeOffRequests, rttRequests, detectedOvertimes] = await Promise.all([
      prisma.clockRecord.findMany({ where: { userId: user.id }, include: { breaks: true }, orderBy: { date: 'asc' } }),
      prisma.timeOffRequest.findMany({ where: { userId: user.id }, orderBy: { startDate: 'asc' } }),
      prisma.rTTRequest.findMany({ where: { userId: user.id }, orderBy: { date: 'asc' } }),
      prisma.detectedOvertime.findMany({ where: { userId: user.id }, orderBy: { date: 'asc' } }),
    ])
    return { profile: user, clockRecords, timeOffRequests, rttRequests, detectedOvertimes }
  }))

  const exportDate = new Date().toISOString().slice(0, 10)

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: 'admin_rgpd_export',
      resource: 'Company',
      resourceId: auth.admin.companyId,
      changes: JSON.stringify({ employeeCount: users.length }),
    },
  })

  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), employees: payload }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="pointon-export-entreprise-${exportDate}.json"`,
    },
  })
}
