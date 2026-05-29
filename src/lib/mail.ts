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

const FROM = `Pointon <${process.env.BREVO_FROM_EMAIL ?? 'noreply@ced-it.be'}>`

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
        <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Pointon</h1>
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
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;">Pointon · ${new Date().getFullYear()}</p>
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
        <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Pointon</h1>
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
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;">Pointon · ${new Date().getFullYear()}</p>
      </div>
    </div>
  `

  await transporter.sendMail({ from: FROM, to, subject, html: body })
}

export async function sendInvitationEmail(params: {
  to: string
  name: string | null
  companyName: string
  token: string
}) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, name, companyName, token } = params
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/set-password?token=${token}`
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,'

  const subject = `Invitation à rejoindre ${companyName} sur Pointon`

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a;">Pointon</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">Pointage légal belge</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <p style="color:#334155;margin:0 0 12px;">${greeting}</p>
        <p style="color:#334155;margin:0 0 24px;">
          Vous avez été invité(e) à rejoindre <strong>${companyName}</strong> sur Pointon.<br>
          Cliquez sur le bouton ci-dessous pour créer votre mot de passe et accéder à l'application.
        </p>

        <a href="${link}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:28px;">
          Créer mon mot de passe →
        </a>

        <p style="color:#64748b;font-size:13px;margin:0 0 4px;">
          ⏱ Ce lien est valable <strong>48 heures</strong>.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:0 0 28px;word-break:break-all;">
          ${link}
        </p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <h2 style="font-size:15px;color:#0f172a;margin:0 0 16px;">📱 Installer l'application sur votre téléphone</h2>

        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:12px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#334155;">🍎 iPhone / iPad (Safari)</p>
          <ol style="margin:0;padding-left:20px;font-size:13px;color:#475569;line-height:1.8;">
            <li>Ouvrez <strong>${appUrl}</strong> dans Safari</li>
            <li>Appuyez sur l'icône <strong>Partager</strong> (carré avec flèche ↑)</li>
            <li>Sélectionnez <strong>« Sur l'écran d'accueil »</strong></li>
            <li>Confirmez avec <strong>« Ajouter »</strong></li>
          </ol>
        </div>

        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#334155;">🤖 Android (Chrome)</p>
          <ol style="margin:0;padding-left:20px;font-size:13px;color:#475569;line-height:1.8;">
            <li>Ouvrez <strong>${appUrl}</strong> dans Chrome</li>
            <li>Appuyez sur le menu <strong>⋮</strong> (3 points)</li>
            <li>Sélectionnez <strong>« Ajouter à l'écran d'accueil »</strong></li>
            <li>Confirmez avec <strong>« Ajouter »</strong></li>
          </ol>
        </div>

        <p style="color:#94a3b8;font-size:12px;margin:0;">Pointon · ${new Date().getFullYear()} · ${companyName}</p>
      </div>
    </div>
  `

  await transporter.sendMail({ from: FROM, to, subject, html })
}

export async function sendPasswordResetEmail(params: {
  to: string
  name: string | null
  token: string
}) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, name, token } = params
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/reset-password?token=${token}`
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,'

  const subject = '🔑 Réinitialisation de votre mot de passe Pointon'

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a;">Pointon</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">Pointage légal belge</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <p style="color:#334155;margin:0 0 12px;">${greeting}</p>
        <p style="color:#334155;margin:0 0 24px;">
          Vous avez demandé la réinitialisation de votre mot de passe.<br>
          Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        </p>

        <a href="${link}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:28px;">
          Réinitialiser mon mot de passe →
        </a>

        <p style="color:#64748b;font-size:13px;margin:0 0 4px;">
          ⏱ Ce lien est valable <strong>24 heures</strong>.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:0 0 24px;word-break:break-all;">
          ${link}
        </p>

        <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:24px;border-left:3px solid #f59e0b;">
          <p style="margin:0;color:#92400e;font-size:13px;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe reste inchangé.
          </p>
        </div>

        <p style="color:#94a3b8;font-size:12px;margin:0;">Pointon · ${new Date().getFullYear()}</p>
      </div>
    </div>
  `

  await transporter.sendMail({ from: FROM, to, subject, html })
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
