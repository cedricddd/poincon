import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { sendEmail } from '@/lib/mail'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { recipients, subject, body, type } = await req.json()
    if (!recipients || !subject || !body) {
      return NextResponse.json(
        { error: 'Missing recipients, subject, or body' },
        { status: 400 }
      )
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients must be non-empty array' }, { status: 400 })
    }

    // Validate recipients
    const validRecipients = recipients.filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))
    if (validRecipients.length === 0) {
      return NextResponse.json({ error: 'No valid email addresses' }, { status: 400 })
    }

    const sentCount = await Promise.all(
      validRecipients.map(async (email) => {
        try {
          await sendEmail({
            to: email,
            subject,
            html: body,
          })
          return 1
        } catch {
          return 0
        }
      })
    ).then((results) => results.reduce((a: number, b: number) => a + b, 0))

    await logAudit({
      userId: session.user.id,
      action: 'SUPER_ADMIN_SEND_EMAIL',
      resource: 'Email',
      changes: {
        type: type || 'CUSTOM',
        recipientCount: validRecipients.length,
        sentCount,
        subject,
      },
    })

    return NextResponse.json({
      success: true,
      sentCount,
      totalRequested: validRecipients.length,
    })
  } catch (error) {
    console.error('Super-admin email error:', error)
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
  }
}
