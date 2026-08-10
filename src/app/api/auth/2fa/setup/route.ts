import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateSecret, verifyTOTP, keyUri } from '@/lib/totp'
import QRCode from 'qrcode'

// GET — generate a new TOTP secret and return QR code (does not save to DB yet)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = session.user
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const secret = generateSecret()
  const otpAuthUrl = keyUri(session.user.email ?? session.user.id, secret)
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)

  // otpAuthUrl is returned as well: on mobile the QR code is unusable (you cannot
  // scan a code displayed on the very phone you would scan it with), so the client
  // offers it as a tap-to-open link into the authenticator app.
  return NextResponse.json({ secret, qrCodeDataUrl, otpAuthUrl })
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

  if (!verifyTOTP(code, secret)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: true },
  })

  return NextResponse.json({ success: true })
}
