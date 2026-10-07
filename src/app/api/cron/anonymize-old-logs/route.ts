import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// Conservation 5 ans par défaut (durée légale belge des données de temps de travail). Configurable par company (1-10
// ans) via l'addon addon_rgpd_export — voir Company.auditLogRetentionYears.
const DEFAULT_RETENTION_YEARS = 5
// L'IP et le User-Agent (données de sécurité) ont une utilité courte : on les purge
// après 1 an, bien avant l'anonymisation complète de l'événement à 5 ans. Cohérent avec
// la politique de confidentialité (minimisation des données).
const IP_RETENTION_YEARS = 1

async function run(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Passe 1 — purge IP/User-Agent de tout log de plus d'1 an (sécurité, métier, orphelins).
  const ipCutoff = new Date()
  ipCutoff.setFullYear(ipCutoff.getFullYear() - IP_RETENTION_YEARS)
  const { count: ipCleared } = await prisma.auditLog.updateMany({
    where: {
      createdAt: { lt: ipCutoff },
      OR: [{ ipAddress: { not: null } }, { userAgent: { not: null } }],
    },
    data: { ipAddress: null, userAgent: null },
  })

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
        // IP + user-agent sont des données personnelles : on les efface aussi à l'anonymisation (RGPD)
        data: { userId: null, anonymizedToken: token, anonymized: true, ipAddress: null, userAgent: null },
      })
      companyTotal += count
    }
    total += companyTotal
    perCompany.push({ companyId: company.id, anonymized: companyTotal })
  }

  // Note : les logs orphelins (userId mis à null par la suppression d'un compte via
  // onDelete: SetNull) ont déjà perdu leur userId ; leur IP/User-Agent est purgé par la
  // passe 1 ci-dessus dès 1 an. Aucune passe dédiée n'est donc nécessaire.

  if (total > 0 || ipCleared > 0) {
    await prisma.auditLog.create({
      data: {
        action: 'cron_anonymize',
        resource: 'AuditLog',
        changes: JSON.stringify({ logsAnonymized: total, perCompany, ipCleared }),
      },
    })
  }

  return NextResponse.json({ anonymized: total, ipCleared, perCompany })
}

// GET and POST both accepted: the busybox cron and the monthly maintenance runbook
// call cron endpoints with a plain wget (GET). Guarded by the x-cron-secret header.
export const GET = run
export const POST = run
