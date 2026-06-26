import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyTOTP } from '@/lib/totp'
import { rateLimit } from '@/lib/rateLimit'

// POST — verify TOTP during login (user already has a session, twoFactorVerified is still false)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`2fa-challenge:${session.user.id}`, 5, 10 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 10 minutes.' }, { status: 429 })

  const body = await req.json() as { code?: string }
  const code = body.code?.replace(/\s/g, '')
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  })

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: '2FA not configured' }, { status: 400 })
  }

  if (!verifyTOTP(code, user.twoFactorSecret)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorTrustedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  })

  return NextResponse.json({ success: true })
}
