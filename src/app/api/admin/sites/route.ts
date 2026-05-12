import { requireAdminWithCompany, forbiddenError } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAdminWithCompany()
  if (!auth) return forbiddenError()

  const sites = await prisma.site.findMany({
    where: {
      clockRecords: {
        some: { user: { companyId: auth.admin.companyId } }
      }
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(sites)
}
