import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getPresenceAccess } from '@/lib/plan'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ presenceForEmployees: false, presenceForManagers: false })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })
  if (!user?.companyId) {
    return NextResponse.json({ presenceForEmployees: false, presenceForManagers: false })
  }

  const access = await getPresenceAccess(user.companyId)
  return NextResponse.json({
    presenceForEmployees: access.hasAccess && access.presenceForEmployees,
    presenceForManagers: access.hasAccess && access.presenceForManagers,
  })
}
