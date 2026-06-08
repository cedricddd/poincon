import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// GET — generate a new TOTP secret and return QR code (does not save to DB yet)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = session.user
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const secret = authenticator.generateSecret()
  const otpAuthUrl = authenticator.keyuri(
    session.user.email ?? session.user.id,
    'Pointon',
    secret,
  )
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)

  return NextResponse.json({ secret, qrCodeDataUrl })
}

// POST — verify TOTP code and save secret to DB
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = session.user
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { secret?: string; code?: string }
  const { secret, code } = body

  if (!secret || !code) {
    return NextResponse.json({ error: 'Missing secret or code' }, { status: 400 })
  }

  const isValid = authenticator.verify({ token: code.replace(/\s/g, ''), secret })
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: true },
  })

  return NextResponse.json({ success: true })
}
