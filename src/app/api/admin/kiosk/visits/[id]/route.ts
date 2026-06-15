import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdminVisit(req: NextRequest, id: string) {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, companyId: true },
  })
  if (!isAdminRole(user?.role) || !user?.companyId) return null
  const visit = await prisma.kioskVisit.findUnique({ where: { id } })
  if (!visit || visit.companyId !== user.companyId) return null
  return visit
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const visit = await requireAdminVisit(req, id)
    if (!visit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (visit.departedAt) return NextResponse.json({ error: 'Départ déjà enregistré' }, { status: 400 })

    const updated = await prisma.kioskVisit.update({
      where: { id },
      data: { departedAt: new Date() },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
