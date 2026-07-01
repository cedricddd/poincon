import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncSeatQuantitySafe } from '@/lib/billing'
import { dispatchWebhookSafe } from '@/lib/webhook'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    select: { id: true, email: true, name: true, expiresAt: true, usedAt: true },
  })

  if (!invitation) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
  if (invitation.usedAt) return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 410 })
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 410 })

  return NextResponse.json({ email: invitation.email, name: invitation.name })
}

export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json()

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: 'Données invalides (mot de passe min. 8 caractères)' }, { status: 400 })
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: { company: { select: { id: true, name: true } } },
  })

  if (!invitation) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
  if (invitation.usedAt) return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 410 })
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 410 })

  const existing = await prisma.user.findUnique({ where: { email: invitation.email } })
  if (existing) return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })

  const hashedPassword = await bcrypt.hash(password, 12)
  const displayName = name?.trim() || invitation.name || invitation.email.split('@')[0]

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: invitation.email,
        name: displayName,
        password: hashedPassword,
        role: invitation.role,
        emailVerified: new Date(),
        companyId: invitation.companyId,
      },
    })

    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    })

    return user
  })

  // New active member → reconcile billed seats with Stripe (non-blocking)
  syncSeatQuantitySafe(invitation.companyId)

  dispatchWebhookSafe(invitation.companyId, 'employee.created', {
    userId: createdUser.id, name: createdUser.name, email: createdUser.email, role: createdUser.role,
  })

  return NextResponse.json({ ok: true, email: invitation.email })
}
