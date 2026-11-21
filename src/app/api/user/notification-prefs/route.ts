import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

/** Roles that review requests, so the only ones who can get an e-mail for each new one. */
const canReview = (role: string | null | undefined) => isAdminRole(role) || role === 'MANAGER'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, emailOnRequests: true },
  })

  return NextResponse.json({ canReview: canReview(user?.role), emailOnRequests: user?.emailOnRequests ?? false })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (!canReview(user?.role)) return NextResponse.json({ error: 'Réservé aux administrateurs et managers' }, { status: 403 })

  const { emailOnRequests } = await req.json().catch(() => ({}))
  if (typeof emailOnRequests !== 'boolean') {
    return NextResponse.json({ error: 'Valeur invalide' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { emailOnRequests } })
  return NextResponse.json({ ok: true, emailOnRequests })
}
