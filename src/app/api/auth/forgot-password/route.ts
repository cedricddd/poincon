import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/mail'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { allowed } = rateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 })
  }

  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, name: true, email: true, active: true },
  })

  // Always return success to prevent user enumeration
  if (!user || !user.active) {
    return NextResponse.json({ ok: true })
  }

  // Invalidate existing unused tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  })

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const { token } = await prisma.passwordResetToken.create({
    data: { userId: user.id, expiresAt },
    select: { token: true },
  })

  await sendPasswordResetEmail({ to: user.email, name: user.name, token })

  return NextResponse.json({ ok: true })
}
