import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return isAdminRole(user?.role) ? session : null
}

async function resolveCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
  if (user?.companyId) return user.companyId
  const company = await prisma.company.findFirst({ where: { adminId: userId }, select: { id: true } })
  return company?.id ?? null
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const companyId = await resolveCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ cycles: [] })

  const cycles = await prisma.rotationCycle.findMany({
    where: { companyId },
    include: {
      periods: { orderBy: { order: 'asc' } },
      teams: { select: { id: true, name: true, rotationPhase: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ cycles })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const companyId = await resolveCompanyId(session.user.id)
  if (!companyId) return NextResponse.json({ error: 'Aucune company' }, { status: 400 })

  const { name, periodUnit = 'WEEK', anchorDate, periods = [] } = await req.json()
  if (!name) return NextResponse.json({ error: 'name requis' }, { status: 400 })
  if (!anchorDate) return NextResponse.json({ error: 'anchorDate requis' }, { status: 400 })

  const cycle = await prisma.rotationCycle.create({
    data: {
      companyId,
      name,
      periodUnit,
      anchorDate: new Date(anchorDate),
      periods: {
        create: periods.map((p: { order: number; label: string; shiftType?: string; startTime?: string; endTime?: string; workDays?: string }, i: number) => ({
          order: p.order ?? i,
          label: p.label,
          shiftType: p.shiftType ?? null,
          startTime: p.startTime ?? null,
          endTime: p.endTime ?? null,
          workDays: p.workDays ?? '[1,2,3,4,5]',
        })),
      },
    },
    include: { periods: { orderBy: { order: 'asc' } } },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_create',
      resource: 'rotation_cycle',
      resourceId: cycle.id,
      changes: JSON.stringify({ name, periodUnit }),
    },
  })

  return NextResponse.json({ cycle }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const { id, name, periodUnit, anchorDate, periods } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const cycle = await prisma.rotationCycle.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(periodUnit && { periodUnit }),
      ...(anchorDate && { anchorDate: new Date(anchorDate) }),
    },
  })

  // Replace all periods if provided
  if (periods) {
    await prisma.rotationPeriod.deleteMany({ where: { cycleId: id } })
    await prisma.rotationPeriod.createMany({
      data: periods.map((p: { order: number; label: string; shiftType?: string; startTime?: string; endTime?: string; workDays?: string }, i: number) => ({
        cycleId: id,
        order: p.order ?? i,
        label: p.label,
        shiftType: p.shiftType ?? null,
        startTime: p.startTime ?? null,
        endTime: p.endTime ?? null,
        workDays: p.workDays ?? '[1,2,3,4,5]',
      })),
    })
  }

  const updated = await prisma.rotationCycle.findUnique({
    where: { id },
    include: { periods: { orderBy: { order: 'asc' } }, teams: { select: { id: true, name: true, rotationPhase: true } } },
  })

  return NextResponse.json({ cycle: updated })
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  await prisma.rotationCycle.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_delete',
      resource: 'rotation_cycle',
      resourceId: id,
    },
  })

  return NextResponse.json({ success: true })
}
