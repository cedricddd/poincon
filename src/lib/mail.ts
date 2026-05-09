import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
})

const FROM = `PoinçOn <${process.env.BREVO_FROM_EMAIL ?? 'noreply@ced-it.be'}>`

type ApprovalEmailParams = {
  to: string
  name: string | null
  type: 'overtime' | 'timeoff' | 'rtt'
  action: 'approve' | 'reject'
  rejectionReason?: string
  detail?: string
}

const TYPE_LABELS: Record<string, string> = {
  overtime: 'heures supplémentaires',
  timeoff: 'congé',
  rtt: 'RTT',
}

export async function sendApprovalEmail(params: ApprovalEmailParams) {
  if (!process.env.BREVO_SMTP_KEY) return // silently skip if not configured

  const { to, name, type, action, rejectionReason, detail } = params
  const label = TYPE_LABELS[type]
  const approved = action === 'approve'
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,'

  const subject = approved
    ? `✅ Votre demande de ${label} a été approuvée`
    : `❌ Votre demande de ${label} a été refusée`

  const body = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">PoinçOn</h1>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
        <p style="color:#334155;margin:0 0 16px;">${greeting}</p>
        <p style="color:#334155;margin:0 0 24px;">
          ${approved
            ? `Votre demande de <strong>${label}</strong> a été <strong style="color:#16a34a;">approuvée</strong>.`
            : `Votre demande de <strong>${label}</strong> a été <strong style="color:#dc2626;">refusée</strong>.`
          }
        </p>
        ${detail ? `<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:24px;color:#475569;font-size:14px;">${detail}</div>` : ''}
        ${!approved && rejectionReason ? `
          <div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:24px;border-left:3px solid #dc2626;">
            <p style="margin:0;color:#991b1b;font-size:14px;"><strong>Motif :</strong> ${rejectionReason}</p>
          </div>` : ''}
        <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/app/reports"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Voir mes rapports
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;">PoinçOn · ${new Date().getFullYear()}</p>
      </div>
    </div>
  `

  await transporter.sendMail({ from: FROM, to, subject, html: body })
}

export async function sendEndOfDayReminderEmail(params: { to: string; name: string | null }) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, name } = params
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,'
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const subject = '⏰ Vous avez oublié de pointer votre départ'

  const body = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">PoinçOn</h1>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
        <p style="color:#334155;margin:0 0 16px;">${greeting}</p>
        <p style="color:#334155;margin:0 0 24px;">
          Il semble que vous soyez toujours pointé(e) et que votre journée dépasse les <strong>8 heures légales</strong>.
          Pensez à pointer votre <strong>départ</strong> pour que vos heures supplémentaires soient correctement comptabilisées.
        </p>
        <a href="${appUrl}/app/clock"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Pointer mon départ
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;">PoinçOn · ${new Date().getFullYear()}</p>
      </div>
    </div>
  `

  await transporter.sendMail({ from: FROM, to, subject, html: body })
}

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, subject, html } = params
  await transporter.sendMail({ from: FROM, to, subject, html })
}
