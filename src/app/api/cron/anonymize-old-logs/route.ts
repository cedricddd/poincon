import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// RGPD belge : conservation max 3 ans par défaut. Configurable par company (1-10
// ans) via l'addon addon_rgpd_export — voir Company.auditLogRetentionYears.
const DEFAULT_RETENTION_YEARS = 3

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, auditLogRetentionYears: true },
  })

  let total = 0
  const perCompany: { companyId: string; anonymized: number }[] = []

  for (const company of companies) {
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - (company.auditLogRetentionYears || DEFAULT_RETENTION_YEARS))

    const oldLogs = await prisma.auditLog.findMany({
      where: {
        anonymized: false,
        userId: { not: null },
        createdAt: { lt: cutoff },
        user: { companyId: company.id },
      },
      select: { id: true, userId: true },
    })
    if (oldLogs.length === 0) continue

    const byUser = new Map<string, string[]>()
    for (const log of oldLogs) {
      const uid = log.userId!
      if (!byUser.has(uid)) byUser.set(uid, [])
      byUser.get(uid)!.push(log.id)
    }

    let companyTotal = 0
    for (const [userId, ids] of byUser.entries()) {
      const token = createHash('sha256').update(userId).digest('hex').slice(0, 16)
      const { count } = await prisma.auditLog.updateMany({
        where: { id: { in: ids } },
        data: { userId: null, anonymizedToken: token, anonymized: true },
      })
      companyTotal += count
    }
    total += companyTotal
    perCompany.push({ companyId: company.id, anonymized: companyTotal })
  }

  if (total > 0) {
    await prisma.auditLog.create({
      data: {
        action: 'cron_anonymize',
        resource: 'AuditLog',
        changes: JSON.stringify({ logsAnonymized: total, perCompany }),
      },
    })
  }

  return NextResponse.json({ anonymized: total, perCompany })
}
