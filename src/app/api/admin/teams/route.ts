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

async function getCompanyId(userId: string): Promise<string | null> {
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

  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { companyId: true } })
  let companyId = admin?.companyId
  if (!companyId) {
    const company = await prisma.company.findFirst({ where: { adminId: session.user.id }, select: { id: true } })
    companyId = company?.id
  }
  if (!companyId) return NextResponse.json({ teams: [] })

  const teams = await prisma.team.findMany({
    where: { companyId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      rotationCycle: {
        include: { periods: { orderBy: { order: 'asc' } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ teams })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'name requis' }, { status: 400 })

  // Toujours la company de l'admin — ne jamais faire confiance à un companyId fourni par le client
  const resolvedCompanyId = await getCompanyId(session.user.id)
  if (!resolvedCompanyId) {
    return NextResponse.json({ error: 'Aucune company associée à cet admin' }, { status: 400 })
  }

  const team = await prisma.team.create({
    data: { name, companyId: resolvedCompanyId },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_create',
      resource: 'team',
      resourceId: team.id,
      changes: JSON.stringify({ name }),
    },
  })

  return NextResponse.json({ team }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const { id, name, rotationCycleId, rotationPhase } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const companyId = await getCompanyId(session.user.id)
  const existing = await prisma.team.findUnique({ where: { id }, select: { companyId: true } })
  if (!existing || !companyId || existing.companyId !== companyId) {
    return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 })
  }

  // Un cycle de rotation assigné doit appartenir à la même entreprise
  if (rotationCycleId) {
    const cycle = await prisma.rotationCycle.findUnique({ where: { id: rotationCycleId }, select: { companyId: true } })
    if (!cycle || cycle.companyId !== companyId) {
      return NextResponse.json({ error: 'Cycle de rotation introuvable' }, { status: 404 })
    }
  }

  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(rotationCycleId !== undefined && { rotationCycleId: rotationCycleId || null }),
      ...(rotationPhase !== undefined && { rotationPhase: rotationPhase !== null ? Number(rotationPhase) : null }),
    },
    include: {
      rotationCycle: { include: { periods: { orderBy: { order: 'asc' } } } },
    },
  })

  return NextResponse.json({ team })
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

  const companyId = await getCompanyId(session.user.id)
  const existing = await prisma.team.findUnique({ where: { id }, select: { companyId: true } })
  if (!existing || !companyId || existing.companyId !== companyId) {
    return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 })
  }

  await prisma.team.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'admin_delete',
      resource: 'team',
      resourceId: id,
    },
  })

  return NextResponse.json({ success: true })
}
