import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    })
    if (!isAdminRole(user?.role) || !user?.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const token = await prisma.kioskToken.findUnique({ where: { id } })
    if (!token || token.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Token introuvable' }, { status: 404 })
    }

    await prisma.kioskToken.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
