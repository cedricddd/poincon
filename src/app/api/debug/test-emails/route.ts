import { NextRequest, NextResponse } from 'next/server'
import {
  sendApprovalEmail,
  sendEndOfDayReminderEmail,
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendKioskVisitorEmail,
} from '@/lib/mail'

// Temporary route to preview the 6 transactional email templates with the new logo header.
// Remove after use — not meant to stay in production.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const to = 'cedric@ced-it.be'

  await sendWelcomeEmail({ to, name: 'Cédric', companyName: 'Aperçu Emails SARL' })
  await sendInvitationEmail({ to, name: 'Cédric', companyName: 'Aperçu Emails SARL', token: 'preview-token' })
  await sendApprovalEmail({ to, name: 'Cédric', type: 'timeoff', action: 'approve' })
  await sendPasswordResetEmail({ to, name: 'Cédric', token: 'preview-token' })
  await sendEndOfDayReminderEmail({ to, name: 'Cédric' })
  await sendKioskVisitorEmail({
    to,
    hostName: 'Cédric',
    visitorName: 'Marie Dupont',
    visitorEmail: 'marie@exemple.be',
    companyName: 'Aperçu Emails SARL',
    arrivedAt: new Date(),
  })

  return NextResponse.json({ sent: 6, to })
}
