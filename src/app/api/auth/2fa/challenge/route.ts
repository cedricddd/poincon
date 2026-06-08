import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyTOTP } from '@/lib/totp'

// POST — verify TOTP during login (user already has a session, twoFactorVerified is still false)
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  return NextResponse.json({ success: true })
}
