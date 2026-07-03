import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { getUserPlan, planCanAccess } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, companyId: true },
  })
  if (!isAdminRole(user?.role) || !user?.companyId) return null
  return { session, companyId: user.companyId as string }
}

// Ensure both the team and the target user belong to the admin's company (prevent cross-tenant IDOR)
async function assertTeamAndUserInCompany(teamId: string, userId: string, companyId: string) {
  const [team, user] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId }, select: { companyId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }),
  ])
  return team?.companyId === companyId && user?.companyId === companyId
}

// Ajouter un membre à une équipe
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(admin.session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const { teamId, userId, role } = await req.json()
  if (!teamId || !userId) return NextResponse.json({ error: 'teamId et userId requis' }, { status: 400 })

  if (!await assertTeamAndUserInCompany(teamId, userId, admin.companyId)) {
    return NextResponse.json({ error: 'Équipe ou utilisateur introuvable' }, { status: 404 })
  }

  const member = await prisma.teamMember.upsert({
    where: { userId_teamId: { userId, teamId } },
    update: { role: role ?? 'member' },
    create: { userId, teamId, role: role ?? 'member' },
  })

  // Si le rôle est manager, mettre à jour le rôle User
  if (role === 'manager') {
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'MANAGER' },
    })
  }

  return NextResponse.json({ member }, { status: 201 })
}

// Retirer un membre d'une équipe
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(admin.session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('teamId')
  const userId = searchParams.get('userId')
  if (!teamId || !userId) return NextResponse.json({ error: 'teamId et userId requis' }, { status: 400 })

  if (!await assertTeamAndUserInCompany(teamId, userId, admin.companyId)) {
    return NextResponse.json({ error: 'Équipe ou utilisateur introuvable' }, { status: 404 })
  }

  await prisma.teamMember.delete({
    where: { userId_teamId: { userId, teamId } },
  })

  // Si l'utilisateur n'est plus manager dans aucune équipe, rétrograder à EMPLOYEE
  const managerRoles = await prisma.teamMember.findFirst({
    where: { userId, role: 'manager' },
  })
  if (!managerRoles) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user?.role === 'MANAGER') {
      await prisma.user.update({ where: { id: userId }, data: { role: 'EMPLOYEE' } })
    }
  }

  return NextResponse.json({ success: true })
}
