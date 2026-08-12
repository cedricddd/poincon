import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/api-v1-auth'
import { brusselsMidnightFromDateString, brusselsDayOffset } from '@/lib/clock'

export async function GET(req: NextRequest) {
  const result = await requireApiKey(req)
  if (!result.ok) return result.response

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const userId = searchParams.get('userId')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)

  const records = await prisma.clockRecord.findMany({
    where: {
      user: { companyId: result.auth.companyId },
      ...(userId && { userId }),
      ...(from || to
        ? {
            date: {
              ...(from && { gte: brusselsMidnightFromDateString(from) }),
              ...(to && { lt: brusselsDayOffset(brusselsMidnightFromDateString(to), 1) }),
            },
          }
        : {}),
    },
    select: {
      id: true, userId: true, arrivalTime: true, departureTime: true, location: true, duration: true, date: true, siteId: true,
    },
    orderBy: { date: 'desc' },
    take: limit,
    skip: offset,
  })

  return NextResponse.json({ clockRecords: records, limit, offset })
}
