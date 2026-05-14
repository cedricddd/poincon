import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return isAdminRole(user?.role) ? session : null
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const teams = await prisma.team.findMany({
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
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

  const { name, companyId } = await req.json()
  if (!name) return NextResponse.json({ error: 'name requis' }, { status: 400 })

  // Récupérer la companyId de l'admin si non fournie
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })
  let resolvedCompanyId = companyId ?? admin?.companyId
  if (!resolvedCompanyId) {
    const company = await prisma.company.findFirst({ where: { adminId: session.user.id }, select: { id: true } })
    resolvedCompanyId = company?.id
  }
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

  const { id, name } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const team = await prisma.team.update({
    where: { id },
    data: { ...(name && { name }) },
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
