import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email || !email.includes('@')) {
    return NextResponse.json(null)
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      companyMember: { select: { name: true, logoUrl: true } },
      company: { select: { name: true, logoUrl: true } },
    },
  })

  const company = user?.companyMember ?? user?.company
  if (!company) return NextResponse.json(null)

  return NextResponse.json({ name: company.name, logoUrl: company.logoUrl })
}
