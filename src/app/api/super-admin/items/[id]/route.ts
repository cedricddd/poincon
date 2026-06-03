import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const item = await prisma.superAdminItem.update({ where: { id: params.id }, data: body })
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.superAdminItem.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
