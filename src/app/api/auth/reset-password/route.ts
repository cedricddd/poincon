import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token manquant.' }, { status: 400 })

  const reset = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { id: true, expiresAt: true, usedAt: true, user: { select: { email: true } } },
  })

  if (!reset) return NextResponse.json({ error: 'Lien invalide ou introuvable.' }, { status: 404 })
  if (reset.usedAt) return NextResponse.json({ error: 'Ce lien a déjà été utilisé.' }, { status: 410 })
  if (reset.expiresAt < new Date()) return NextResponse.json({ error: 'Ce lien a expiré.' }, { status: 410 })

  return NextResponse.json({ email: reset.user.email })
}

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: 'Données invalides (mot de passe min. 8 caractères).' }, { status: 400 })
  }

  const reset = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true } } },
  })

  if (!reset) return NextResponse.json({ error: 'Lien invalide ou introuvable.' }, { status: 404 })
  if (reset.usedAt) return NextResponse.json({ error: 'Ce lien a déjà été utilisé.' }, { status: 410 })
  if (reset.expiresAt < new Date()) return NextResponse.json({ error: 'Ce lien a expiré.' }, { status: 410 })

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.user.id },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ])

  return NextResponse.json({ ok: true, email: reset.user.email })
}
