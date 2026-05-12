import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return user?.role === 'ADMIN' ? session : null
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })
  if (!admin?.companyId) return NextResponse.json({ error: 'Company not found' }, { status: 400 })

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50'))
  const skip = (page - 1) * limit

  const userId = url.searchParams.get('userId') ?? undefined
  const action = url.searchParams.get('action') ?? undefined
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const where: any = {
    user: {
      companyId: admin.companyId,
    },
  }
  if (userId) where.userId = userId
  if (action) where.action = action
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}
