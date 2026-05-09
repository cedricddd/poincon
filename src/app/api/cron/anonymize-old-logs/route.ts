import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// RGPD belge : conservation max 3 ans pour les audit logs
const RETENTION_YEARS = 3

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS)

  // Trouver les logs non anonymisés avec userId, plus vieux que 3 ans
  const oldLogs = await prisma.auditLog.findMany({
    where: { anonymized: false, userId: { not: null }, createdAt: { lt: cutoff } },
    select: { id: true, userId: true },
  })

  if (oldLogs.length === 0) {
    return NextResponse.json({ anonymized: 0, message: 'Aucun log à anonymiser' })
  }

  // Grouper par userId pour générer un token cohérent par utilisateur
  const byUser = new Map<string, string[]>()
  for (const log of oldLogs) {
    const uid = log.userId!
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid)!.push(log.id)
  }

  let total = 0
  for (const [userId, ids] of byUser.entries()) {
    const token = createHash('sha256').update(userId).digest('hex').slice(0, 16)
    const { count } = await prisma.auditLog.updateMany({
      where: { id: { in: ids } },
      data: { userId: null, anonymizedToken: token, anonymized: true },
    })
    total += count
  }

  await prisma.auditLog.create({
    data: {
      action: 'cron_anonymize',
      resource: 'AuditLog',
      changes: JSON.stringify({ logsAnonymized: total, cutoffDate: cutoff.toISOString() }),
    },
  })

  return NextResponse.json({ anonymized: total, cutoffDate: cutoff.toISOString() })
}
