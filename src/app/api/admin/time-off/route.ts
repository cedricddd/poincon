import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return user?.role === 'ADMIN' ? session : null
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, startDate, endDate, reason, status } = await req.json()
  if (!userId || !startDate || !endDate) {
    return NextResponse.json({ error: 'userId, startDate et endDate sont requis' }, { status: 400 })
  }

  const record = await prisma.timeOffRequest.create({
    data: {
      userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason ?? null,
      status: status ?? 'APPROVED',
      approvedBy: session.user.id,
      approvedAt: new Date(),
    },
  })

  await prisma.notification.create({
    data: {
      userId,
      message: `Un congé du ${startDate} au ${endDate} a été enregistré par l'administrateur.`,
      type: 'info',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_create',
      resource: 'timeOff',
      resourceId: record.id,
      changes: JSON.stringify({ startDate, endDate, reason, status }),
    },
  })

  return NextResponse.json({ record })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, startDate, endDate, reason, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const existing = await prisma.timeOffRequest.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Congé introuvable' }, { status: 404 })

  const record = await prisma.timeOffRequest.update({
    where: { id },
    data: {
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      reason: reason !== undefined ? reason : existing.reason,
      status: status ?? existing.status,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_edit',
      resource: 'timeOff',
      resourceId: id,
      changes: JSON.stringify({ startDate, endDate, reason, status }),
    },
  })

  return NextResponse.json({ record })
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  await prisma.timeOffRequest.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_delete',
      resource: 'timeOff',
      resourceId: id,
    },
  })

  return NextResponse.json({ success: true })
}
