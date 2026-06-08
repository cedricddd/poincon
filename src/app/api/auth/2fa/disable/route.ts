import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { authenticator } from 'otplib'

// DELETE — disable 2FA (requires current TOTP code as proof)
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = session.user
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

  const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret })
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  })

  return NextResponse.json({ success: true })
}
