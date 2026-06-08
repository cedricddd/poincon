import { NextResponse } from 'next/server'
import { requireAdminWithCompany } from '@/lib/admin-security'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const auth = await requireAdminWithCompany()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.company.update({
    where: { id: auth.admin.companyId },
    data: { onboardingCompleted: true },
  })

  return NextResponse.json({ ok: true })
}
