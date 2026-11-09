import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyTOTP } from '@/lib/totp'
import { clearTrustCookie } from '@/lib/two-factor-trust'

// DELETE — "change device": removes the current 2FA secret so a new device can be set up
// right away. 2FA stays mandatory: the session loses its verified state and the proxy sends
// the admin to /2fa/setup. Requires a verified session and the current code.
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = session.user
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!session.user.twoFactorVerified) {
    return NextResponse.json({ error: '2FA required' }, { status: 403 })
  }

  const body = await req.json() as { code?: string }
  const code = body.code?.replace(/\s/g, '')
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  })

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: '2FA not enabled' }, { status: 400 })
  }

  if (!verifyTOTP(code, user.twoFactorSecret)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  })

  const res = NextResponse.json({ success: true })
  clearTrustCookie(res)
  return res
}
