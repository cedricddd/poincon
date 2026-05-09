import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (admin?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  // Token opaque : hash sha256 de l'userId — non réversible, garde la cohérence des logs
  const token = createHash('sha256').update(userId).digest('hex').slice(0, 16)

  const { count } = await prisma.auditLog.updateMany({
    where: { userId, anonymized: false },
    data: { userId: null, anonymizedToken: token, anonymized: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_anonymize',
      resource: 'user',
      resourceId: userId,
      changes: JSON.stringify({ logsAnonymized: count }),
    },
  })

  return NextResponse.json({ success: true, logsAnonymized: count })
}
