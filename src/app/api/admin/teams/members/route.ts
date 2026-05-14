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

// Ajouter un membre à une équipe
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const { teamId, userId, role } = await req.json()
  if (!teamId || !userId) return NextResponse.json({ error: 'teamId et userId requis' }, { status: 400 })

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
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plan = await getUserPlan(session.user.id)
  if (!planCanAccess(plan, 'teams')) {
    return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('teamId')
  const userId = searchParams.get('userId')
  if (!teamId || !userId) return NextResponse.json({ error: 'teamId et userId requis' }, { status: 400 })

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
