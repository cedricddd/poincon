import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { deleteDemoCompany } from '@/lib/demo-seed'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expired = await prisma.company.findMany({
    where: { isDemo: true, demoExpiresAt: { lt: new Date() }, deletedAt: null },
    select: { id: true, name: true },
  })

  const deleted: string[] = []
  for (const company of expired) {
    await deleteDemoCompany(company.id)
    deleted.push(company.id)
  }

  if (deleted.length > 0) {
    await logAudit({
      userId: null,
      action: 'cron_delete_expired_demos',
      resource: 'Company',
      changes: { deletedCompanyIds: deleted },
    })
  }

  return NextResponse.json({ deleted: deleted.length })
}
