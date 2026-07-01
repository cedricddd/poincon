import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/api-v1-auth'

export async function GET(req: NextRequest) {
  const result = await requireApiKey(req)
  if (!result.ok) return result.response

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const userId = searchParams.get('userId')
  const status = searchParams.get('status')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)

  const requests = await prisma.timeOffRequest.findMany({
    where: {
      user: { companyId: result.auth.companyId },
      ...(userId && { userId }),
      ...(status && { status }),
      ...(from && { endDate: { gte: new Date(from) } }),
      ...(to && { startDate: { lte: new Date(to + 'T23:59:59.999Z') } }),
    },
    select: {
      id: true, userId: true, startDate: true, endDate: true, leaveType: true, status: true, reason: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return NextResponse.json({ timeOffRequests: requests, limit, offset })
}
