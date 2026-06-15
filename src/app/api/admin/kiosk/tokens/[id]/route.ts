import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdminToken(req: NextRequest, id: string) {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, companyId: true },
  })
  if (!isAdminRole(user?.role) || !user?.companyId) return null
  const token = await prisma.kioskToken.findUnique({ where: { id } })
  if (!token || token.companyId !== user.companyId) return null
  return token
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await requireAdminToken(req, id)
    if (!token) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { theme } = await req.json()
    if (!['dark', 'light'].includes(theme)) {
      return NextResponse.json({ error: 'Thème invalide' }, { status: 400 })
    }

    const updated = await prisma.kioskToken.update({
      where: { id },
      data: { theme },
      include: { site: { select: { id: true, name: true } } },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await requireAdminToken(req, id)
    if (!token) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.kioskToken.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
