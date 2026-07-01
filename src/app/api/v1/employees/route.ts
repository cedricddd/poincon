import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/api-v1-auth'

export async function GET(req: NextRequest) {
  const result = await requireApiKey(req)
  if (!result.ok) return result.response

  const employees = await prisma.user.findMany({
    where: { companyId: result.auth.companyId, deletedAt: null },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ employees })
}
