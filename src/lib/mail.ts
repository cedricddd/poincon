import nodemailer from 'nodemailer'
import { getTranslations } from 'next-intl/server'

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
})

const FROM = `Pointon <${process.env.BREVO_FROM_EMAIL ?? 'noreply@pointon.be'}>`

type ApprovalEmailParams = {
  to: string
  name: string | null
  type: 'overtime' | 'timeoff' | 'rtt'
  action: 'approve' | 'reject'
  rejectionReason?: string
  detail?: string
  locale?: string
}

export async function sendApprovalEmail(params: ApprovalEmailParams) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, name, type, action, rejectionReason, detail, locale = 'fr' } = params
  const t = await getTranslations({ locale, namespace: 'emails' })

  const typeKey = `approval.type${type.charAt(0).toUpperCase()}${type.slice(1)}` as Parameters<typeof t>[0]
  const typeLabel = t(typeKey)
  const approved = action === 'approve'
  const greeting = name ? t('greeting', { name }) : t('greetingGeneric')
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const subject = approved
    ? t('approval.subjectApproved', { type: typeLabel })
    : t('approval.subjectRejected', { type: typeLabel })

  const body = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Pointon</h1>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
        <p style="color:#334155;margin:0 0 16px;">${greeting}</p>
        <p style="color:#334155;margin:0 0 24px;">
          ${approved
            ? t('approval.bodyApproved', { type: typeLabel })
            : t('approval.bodyRejected', { type: typeLabel })
          }
        </p>
        ${detail ? `<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:24px;color:#475569;font-size:14px;">${detail}</div>` : ''}
        ${!approved && rejectionReason ? `
          <div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:24px;border-left:3px solid #dc2626;">
            <p style="margin:0;color:#991b1b;font-size:14px;">${t('approval.reason', { reason: rejectionReason })}</p>
          </div>` : ''}
        <a href="${appUrl}/app/reports"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          ${t('approval.button')}
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;">${t('footer', { year: String(new Date().getFullYear()) })}</p>
      </div>
    </div>
  `

  await transporter.sendMail({ from: FROM, to, subject, html: body })
}

export async function sendEndOfDayReminderEmail(params: { to: string; name: string | null; locale?: string }) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, name, locale = 'fr' } = params
  const t = await getTranslations({ locale, namespace: 'emails' })
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const greeting = name ? t('greeting', { name }) : t('greetingGeneric')

  const body = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Pointon</h1>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
        <p style="color:#334155;margin:0 0 16px;">${greeting}</p>
        <p style="color:#334155;margin:0 0 8px;">${t('endOfDay.body')}</p>
        <p style="color:#334155;margin:0 0 24px;">${t('endOfDay.advice')}</p>
        <a href="${appUrl}/app/clock"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          ${t('endOfDay.button')}
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;">${t('footer', { year: String(new Date().getFullYear()) })}</p>
      </div>
    </div>
  `

  await transporter.sendMail({ from: FROM, to, subject: t('endOfDay.subject'), html: body })
}

export async function sendInvitationEmail(params: {
  to: string
  name: string | null
  companyName: string
  token: string
  locale?: string
}) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, name, companyName, token, locale = 'fr' } = params
  const t = await getTranslations({ locale, namespace: 'emails' })
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/set-password?token=${token}`
  const greeting = name ? t('greeting', { name }) : t('greetingGeneric')

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a;">Pointon</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">Pointage légal belge</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <p style="color:#334155;margin:0 0 12px;">${greeting}</p>
        <p style="color:#334155;margin:0 0 4px;">${t('invitation.body', { company: companyName })}</p>
        <p style="color:#334155;margin:0 0 24px;">${t('invitation.bodyDescription')}</p>

        <a href="${link}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:28px;">
          ${t('invitation.button')}
        </a>

        <p style="color:#64748b;font-size:13px;margin:0 0 4px;">
          ⏱ ${t('invitation.validity')}
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:0 0 28px;word-break:break-all;">
          ${link}
        </p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <h2 style="font-size:15px;color:#0f172a;margin:0 0 16px;">${t('invitation.installTitle')}</h2>

        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:12px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#334155;">${t('invitation.iphoneTitle')}</p>
          <ol style="margin:0;padding-left:20px;font-size:13px;color:#475569;line-height:1.8;">
            <li>${t('invitation.installStep1Safari', { url: appUrl })}</li>
            <li>${t('invitation.installStep2Safari')}</li>
            <li>${t('invitation.installStep3Safari')}</li>
            <li>${t('invitation.installStep4Safari')}</li>
          </ol>
        </div>

        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#334155;">${t('invitation.androidTitle')}</p>
          <ol style="margin:0;padding-left:20px;font-size:13px;color:#475569;line-height:1.8;">
            <li>${t('invitation.installStep1Chrome', { url: appUrl })}</li>
            <li>${t('invitation.installStep2Chrome')}</li>
            <li>${t('invitation.installStep3Chrome')}</li>
            <li>${t('invitation.installStep4Chrome')}</li>
          </ol>
        </div>

        <p style="color:#94a3b8;font-size:12px;margin:0;">${t('footer', { year: String(new Date().getFullYear()) })} · ${companyName}</p>
      </div>
    </div>
  `

  await transporter.sendMail({ from: FROM, to, subject: t('invitation.subject', { company: companyName }), html })
}

export async function sendPasswordResetEmail(params: {
  to: string
  name: string | null
  token: string
  locale?: string
}) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, name, token, locale = 'fr' } = params
  const t = await getTranslations({ locale, namespace: 'emails' })
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/reset-password?token=${token}`
  const greeting = name ? t('greeting', { name }) : t('greetingGeneric')

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a;">Pointon</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">Pointage légal belge</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <p style="color:#334155;margin:0 0 12px;">${greeting}</p>
        <p style="color:#334155;margin:0 0 24px;">${t('passwordReset.body')}</p>

        <a href="${link}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:28px;">
          ${t('passwordReset.button')}
        </a>

        <p style="color:#64748b;font-size:13px;margin:0 0 4px;">
          ⏱ ${t('passwordReset.validity')}
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:0 0 24px;word-break:break-all;">
          ${link}
        </p>

        <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:24px;border-left:3px solid #f59e0b;">
          <p style="margin:0;color:#92400e;font-size:13px;">${t('passwordReset.warning')}</p>
        </div>

        <p style="color:#94a3b8;font-size:12px;margin:0;">${t('footer', { year: String(new Date().getFullYear()) })}</p>
      </div>
    </div>
  `

  await transporter.sendMail({ from: FROM, to, subject: t('passwordReset.subject'), html })
}

export async function sendWelcomeEmail(params: {
  to: string
  name: string
  companyName: string
  locale?: string
}) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, name, companyName, locale = 'fr' } = params
  const t = await getTranslations({ locale, namespace: 'emails' })
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a;">Pointon</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">Pointage légal belge</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <p style="color:#334155;margin:0 0 12px;">${t('greeting', { name })}</p>
        <p style="color:#334155;margin:0 0 8px;">${t('welcome.body', { company: companyName })}</p>
        <p style="color:#334155;margin:0 0 24px;">${t('welcome.description')}</p>

        <a href="${appUrl}/admin/onboarding"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:28px;">
          ${t('welcome.button')}
        </a>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">

        <p style="color:#475569;font-size:13px;margin:0 0 8px;"><strong>${t('welcome.checklistTitle')}</strong></p>
        <ul style="color:#475569;font-size:13px;margin:0 0 24px;padding-left:20px;line-height:1.9;">
          <li>${t('welcome.checklistItem1')}</li>
          <li>${t('welcome.checklistItem2')}</li>
          <li>${t('welcome.checklistItem3')}</li>
          <li>${t('welcome.checklistItem4')}</li>
        </ul>

        <p style="color:#94a3b8;font-size:12px;margin:0;">
          ${t('footer', { year: String(new Date().getFullYear()) })} · ${t('welcome.question')}
        </p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: FROM,
    to,
    subject: t('welcome.subject', { company: companyName }),
    html,
  })
}

export async function sendNewCompanyNotification(params: {
  companyName: string
  adminName: string
  adminEmail: string
  vatNumber: string
  companyId: string
}) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { companyName, adminName, adminEmail, vatNumber, companyId } = params
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const notifyEmail = process.env.SUPER_ADMIN_NOTIFY_EMAIL ?? 'cedric@pointon.be'
  const date = new Date().toLocaleString('fr-BE', { dateStyle: 'full', timeStyle: 'short' })

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a;">Pointon</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">Notification super-admin</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <p style="color:#334155;margin:0 0 20px;font-size:16px;">
          🆕 <strong>Nouvelle société inscrite</strong>
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#64748b;width:140px;">Société</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${companyName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Administrateur</td><td style="padding:8px 0;color:#0f172a;">${adminName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;color:#0f172a;">${adminEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">TVA</td><td style="padding:8px 0;color:#0f172a;">${vatNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;color:#0f172a;">${date}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Plan</td><td style="padding:8px 0;"><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">FREE</span></td></tr>
        </table>

        <a href="${appUrl}/super-admin/accounts"
           style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Voir dans le super-admin →
        </a>

        <p style="color:#94a3b8;font-size:12px;margin-top:28px;">Pointon · Notification automatique</p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: FROM,
    to: notifyEmail,
    subject: `🆕 Nouvelle société : ${companyName}`,
    html,
  })
}

export async function sendKioskVisitorEmail(params: {
  to: string
  hostName: string | null
  visitorName: string
  visitorEmail: string
  companyName: string
  arrivedAt: Date
  locale?: string
}) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { to, hostName, visitorName, visitorEmail, companyName, arrivedAt, locale = 'fr' } = params
  const t = await getTranslations({ locale, namespace: 'emails' })

  const bcp47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }
  const greeting = hostName ? t('greeting', { name: hostName }) : t('greetingGeneric')
  const time = arrivedAt.toLocaleTimeString(bcp47[locale] ?? 'fr-BE', { hour: '2-digit', minute: '2-digit' })

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a;">Pointon</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">Notification visiteur</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <p style="color:#334155;margin:0 0 16px;">${greeting}</p>
        <p style="color:#334155;margin:0 0 24px;">${t('kioskVisitor.body', { visitor: visitorName, time })}</p>

        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 6px;font-size:14px;color:#475569;">${t('kioskVisitor.sectionVisitor')}</p>
          <p style="margin:0 0 2px;font-size:15px;color:#0f172a;font-weight:600;">${visitorName}</p>
          <p style="margin:0;font-size:14px;color:#64748b;">${visitorEmail}</p>
        </div>

        <p style="color:#94a3b8;font-size:12px;margin:0;">${t('footer', { year: String(new Date().getFullYear()) })} · ${companyName}</p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: FROM,
    to,
    subject: t('kioskVisitor.subject', { visitor: visitorName }),
    html,
  })
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

export async function sendInternalInvoiceAlert(params: {
  companyName: string
  amountPaid: number
  currency: string
  plan: string | null
  billingCycle: string
  stripeInvoiceId: string
  odooInvoiceId: number | null
}) {
  if (!process.env.BREVO_SMTP_KEY) return

  const { companyName, amountPaid, currency, plan, billingCycle, stripeInvoiceId, odooInvoiceId } = params
  const notifyEmail = process.env.SUPER_ADMIN_NOTIFY_EMAIL ?? 'cedric@ced-it.be'
  const odooUrl = 'https://ced-it.odoo.com/odoo/accounting/customer-invoices'
  const date = new Date().toLocaleString('fr-BE', { dateStyle: 'full', timeStyle: 'short' })
  const amount = (amountPaid / 100).toLocaleString('fr-BE', { style: 'currency', currency: currency.toUpperCase() })
  const cycleLabel = billingCycle === 'yearly' ? 'Annuel' : 'Mensuel'
  const odooStatus = odooInvoiceId
    ? `✅ Facture Odoo créée (#${odooInvoiceId}) — <strong>à envoyer manuellement</strong>`
    : `⚠️ Facture Odoo non créée (sync échouée) — vérifier les logs`

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a;">Pointon</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">Notification super-admin</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

        <p style="color:#334155;margin:0 0 20px;font-size:16px;">
          💰 <strong>Nouveau paiement reçu</strong>
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#64748b;width:160px;">Société</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${companyName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Montant</td><td style="padding:8px 0;color:#10b981;font-weight:700;font-size:16px;">${amount}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Plan</td><td style="padding:8px 0;color:#0f172a;">${plan ?? 'Inconnu'} · ${cycleLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;color:#0f172a;">${date}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Stripe Invoice</td><td style="padding:8px 0;color:#64748b;font-size:12px;">${stripeInvoiceId}</td></tr>
        </table>

        <div style="background:#fef3c7;border-radius:8px;padding:14px 16px;margin-bottom:24px;border-left:3px solid #f59e0b;">
          <p style="margin:0;color:#92400e;font-size:14px;">${odooStatus}</p>
        </div>

        <a href="${odooUrl}"
           style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Ouvrir Odoo — Factures clients →
        </a>

        <p style="color:#94a3b8;font-size:12px;margin-top:28px;">Pointon · Notification automatique</p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: FROM,
    to: notifyEmail,
    subject: `💰 Paiement reçu : ${companyName} — ${amount}`,
    html,
  })
}
