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

  const { userId, date, hoursToRecover, reason, status } = await req.json()
  if (!userId || !date || !hoursToRecover) {
    return NextResponse.json({ error: 'userId, date et hoursToRecover sont requis' }, { status: 400 })
  }

  const record = await prisma.rTTRequest.create({
    data: {
      userId,
      date: new Date(date),
      hoursToRecover: parseFloat(hoursToRecover),
      reason: reason ?? null,
      status: status ?? 'APPROVED',
      approvedBy: session.user.id,
      approvedAt: new Date(),
    },
  })

  await prisma.notification.create({
    data: {
      userId,
      message: `Un RTT du ${date} (${hoursToRecover}h) a été enregistré par l'administrateur.`,
      type: 'info',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_create',
      resource: 'rtt',
      resourceId: record.id,
      changes: JSON.stringify({ date, hoursToRecover, reason, status }),
    },
  })

  return NextResponse.json({ record })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, date, hoursToRecover, reason, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const existing = await prisma.rTTRequest.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'RTT introuvable' }, { status: 404 })

  const record = await prisma.rTTRequest.update({
    where: { id },
    data: {
      date: date ? new Date(date) : existing.date,
      hoursToRecover: hoursToRecover !== undefined ? parseFloat(hoursToRecover) : existing.hoursToRecover,
      reason: reason !== undefined ? reason : existing.reason,
      status: status ?? existing.status,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_edit',
      resource: 'rtt',
      resourceId: id,
      changes: JSON.stringify({ date, hoursToRecover, reason, status }),
    },
  })

  return NextResponse.json({ record })
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  await prisma.rTTRequest.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_delete',
      resource: 'rtt',
      resourceId: id,
    },
  })

  return NextResponse.json({ success: true })
}
