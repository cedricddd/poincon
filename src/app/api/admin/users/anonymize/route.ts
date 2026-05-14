import { prisma } from '@/lib/prisma'
import { requireAdminWithCompany, forbiddenError, canAccessUser } from '@/lib/admin-security'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  if (!(await canAccessUser(auth.admin.companyId, userId))) {
    return forbiddenError()
  }

  // Token opaque : hash sha256 de l'userId — non réversible, garde la cohérence des logs
  const token = createHash('sha256').update(userId).digest('hex').slice(0, 16)

  const { count } = await prisma.auditLog.updateMany({
    where: { userId, anonymized: false },
    data: { userId: null, anonymizedToken: token, anonymized: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: auth.admin.id,
      action: 'admin_anonymize',
      resource: 'user',
      resourceId: userId,
      changes: JSON.stringify({ logsAnonymized: count }),
    },
  })

  return NextResponse.json({ success: true, logsAnonymized: count })
}
