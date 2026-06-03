import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') return null
  return session
}

export async function GET() {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const items = await prisma.superAdminItem.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const item = await prisma.superAdminItem.create({ data: body })
  return NextResponse.json(item)
}
