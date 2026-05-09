import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== 'ADMIN') return null
  return session
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin(req)
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        defaultSiteId: true,
        defaultSite: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin(req)
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { id, name, email, role, password, defaultSiteId } = body
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const allowedRoles = ['EMPLOYEE', 'ADMIN']
    const data: Record<string, unknown> = {}
    if (name) data.name = name
    if (email) data.email = email
    if (role && allowedRoles.includes(role)) data.role = role
    if (password) data.password = await bcrypt.hash(password, 10)
    if ('defaultSiteId' in body) data.defaultSiteId = defaultSiteId ?? null

    const user = await prisma.user.update({ where: { id }, data })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'admin_update_user',
        resource: 'User',
        resourceId: id,
        changes: JSON.stringify({ name, email, role, passwordChanged: !!password }),
      },
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin(req)
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    if (id === session.user.id) {
      return NextResponse.json({ error: 'Impossible de supprimer votre propre compte' }, { status: 400 })
    }

    // Anonymiser les audit logs avant suppression (RGPD)
    const token = createHash('sha256').update(id).digest('hex').slice(0, 16)
    await prisma.auditLog.updateMany({
      where: { userId: id, anonymized: false },
      data: { userId: null, anonymizedToken: token, anonymized: true },
    })

    await prisma.user.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'admin_delete_user',
        resource: 'User',
        resourceId: id,
        changes: JSON.stringify({}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
