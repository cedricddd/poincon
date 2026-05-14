import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const PAGE_SIZE = 30

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))

  const where = {
    userId: session.user.id,
    ...(from || to ? {
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
      },
    } : {}),
  }

  const [total, records] = await Promise.all([
    prisma.clockRecord.count({ where }),
    prisma.clockRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  // Stats
  const allForStats = await prisma.clockRecord.findMany({
    where,
    select: { duration: true, departureTime: true },
  })
  const completed = allForStats.filter(r => r.departureTime !== null)
  const totalMinutes = completed.reduce((s, r) => s + (r.duration ?? 0), 0)
  const avgMinutes = completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0
  const incompleteCount = allForStats.length - completed.length

  return NextResponse.json({
    records,
    total,
    pages: Math.ceil(total / PAGE_SIZE),
    stats: { totalMinutes, avgMinutes, completedCount: completed.length, incompleteCount },
  })
}
