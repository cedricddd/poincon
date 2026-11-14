import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'test' })
  const createTransport = vi.fn(() => ({ sendMail }))
  return { sendMail, createTransport }
})

vi.mock('nodemailer', () => ({ default: { createTransport } }))
vi.mock('next-intl/server', () => ({ getTranslations: vi.fn() }))

const SMTP_VARS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_TLS_SERVERNAME', 'MAIL_FROM'] as const

async function loadMail() {
  // Fresh module each time: the transporter is created once per module instance.
  vi.resetModules()
  return import('./mail')
}

describe('mail transport', () => {
  beforeEach(() => {
    for (const key of SMTP_VARS) vi.stubEnv(key, '')
    sendMail.mockClear()
    createTransport.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is not configured when host, user or password is missing', async () => {
    const { isMailConfigured } = await loadMail()
    expect(isMailConfigured()).toBe(false)

    vi.stubEnv('SMTP_HOST', 'mail.pointon.be')
    vi.stubEnv('SMTP_USER', 'noreply@pointon.be')
    expect(isMailConfigured()).toBe(false)

    vi.stubEnv('SMTP_PASS', 'secret')
    vi.stubEnv('SMTP_HOST', '')
    expect(isMailConfigured()).toBe(false)
  })

  it('is configured when host, user and password are set', async () => {
    vi.stubEnv('SMTP_HOST', 'mail.pointon.be')
    vi.stubEnv('SMTP_USER', 'noreply@pointon.be')
    vi.stubEnv('SMTP_PASS', 'secret')
    const { isMailConfigured } = await loadMail()
    expect(isMailConfigured()).toBe(true)
  })

  it('connects with STARTTLS required, default port 587 and a reply-to', async () => {
    vi.stubEnv('SMTP_HOST', 'mail.pointon.be')
    vi.stubEnv('SMTP_USER', 'noreply@pointon.be')
    vi.stubEnv('SMTP_PASS', 'secret')
    const { sendRawMail } = await loadMail()

    await sendRawMail({ to: 'a@example.com', subject: 's', html: '<p>x</p>' })

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mail.pointon.be',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: 'noreply@pointon.be', pass: 'secret' },
      }),
      { replyTo: 'contact@pointon.be' },
    )
  })

  it('validates TLS against SMTP_TLS_SERVERNAME when connecting by IP', async () => {
    vi.stubEnv('SMTP_HOST', '10.0.0.110')
    vi.stubEnv('SMTP_TLS_SERVERNAME', 'mail.pointon.be')
    const { sendRawMail } = await loadMail()

    await sendRawMail({ to: 'a@example.com', subject: 's', html: 'h' })

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: '10.0.0.110', tls: { servername: 'mail.pointon.be' } }),
      expect.anything(),
    )
  })

  it('uses the default sender unless MAIL_FROM is set, and keeps attachments', async () => {
    const { sendRawMail } = await loadMail()
    const attachments = [{ filename: 'a.csv', content: 'x' }]

    await sendRawMail({ to: 'a@example.com', subject: 's', html: 'h', attachments })
    expect(sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: 'Pointon <noreply@pointon.be>', attachments }),
    )

    vi.stubEnv('MAIL_FROM', 'hello@pointon.be')
    await sendRawMail({ to: 'a@example.com', subject: 's', html: 'h' })
    expect(sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: 'Pointon <hello@pointon.be>' }),
    )
  })

  it('skips high-level emails silently when SMTP is not configured', async () => {
    const { sendEmail } = await loadMail()
    await sendEmail({ to: 'a@example.com', subject: 's', html: 'h' })
    expect(sendMail).not.toHaveBeenCalled()
  })
})
