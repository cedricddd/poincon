import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const overtimes = await prisma.detectedOvertime.findMany({
    where: { user: { companyId: auth.admin.companyId } },
    include: { user: { select: { name: true, email: true } }, approver: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ overtimes })
}
