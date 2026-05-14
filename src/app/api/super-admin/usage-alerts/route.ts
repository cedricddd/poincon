import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const companies = await prisma.company.findMany({
      where: { deletedAt: null, planId: { not: null } },
      include: {
        plan: { select: { name: true, maxEmployees: true } },
        members: { where: { deletedAt: null }, select: { id: true } },
        admin: { select: { email: true, name: true } },
      },
    })

    const alerts = companies
      .filter((c) => {
        const maxEmployees = c.plan?.maxEmployees
        const activeMembers = c.members.length
        return maxEmployees && maxEmployees !== -1 && activeMembers > maxEmployees
      })
      .map((c) => ({
        companyId: c.id,
        companyName: c.name,
        plan: c.plan?.name,
        activeMembers: c.members.length,
        maxAllowed: c.plan?.maxEmployees,
        adminEmail: c.admin.email,
        adminName: c.admin.name,
        overageCount: c.members.length - (c.plan?.maxEmployees || 0),
      }))

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Super-admin usage alerts error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage alerts' }, { status: 500 })
  }
}
