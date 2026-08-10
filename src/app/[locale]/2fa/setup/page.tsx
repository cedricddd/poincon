'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import Image from 'next/image'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'

export default function TwoFactorSetupPage() {
  const t = useTranslations('auth.2fa')
  const { data: session, update } = useSession()
  const router = useRouter()

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [otpAuthUrl, setOtpAuthUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showManualKey, setShowManualKey] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/auth/2fa/setup')
      .then((r) => r.json())
      .then((data: { secret: string; qrCodeDataUrl: string; otpAuthUrl: string }) => {
        setSecret(data.secret)
        setQrCodeDataUrl(data.qrCodeDataUrl)
        setOtpAuthUrl(data.otpAuthUrl)
      })
  }, [session?.user?.id])

  // Already set up and verified → go to dashboard
  useEffect(() => {
    if (session?.user?.twoFactorVerified) {
      router.replace('/admin/dashboard')
    }
  }, [session?.user?.twoFactorVerified, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!secret) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, code }),
      })
      const data = await res.json() as { success?: boolean; error?: string }

      if (!res.ok) {
        setError(data.error ?? t('invalidCode'))
        return
      }

      // Mark session as 2FA verified + enabled
      await update({ twoFactorVerified: true, twoFactorEnabled: true })
      // Hard navigation: a soft router.replace can land back on this page, since the
      // Next.js router cache/refresh targets the route we're leaving, not the destination.
      window.location.href = '/admin/dashboard'
    } catch {
      setError(t('networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Logo size="lg" useThemeVar />
          <p className="text-[var(--pp-muted)] mt-2">{t('setupHeaderMuted')}</p>
        </div>

        <Card>
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-[var(--pp-ink)]">
                {t('setupHeading')}
              </h1>
              <p className="text-sm text-[var(--pp-muted)] mt-1">
                {t('setupSubtitle')}
              </p>
            </div>

            <ol className="space-y-4 text-sm text-[var(--pp-ink)]">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--pp-info)]/10 border border-[var(--pp-info)]/30 flex items-center justify-center text-[var(--pp-info)] font-medium text-xs">1</span>
                <span>{t.rich('step1', { b: (c) => <strong>{c}</strong> })}</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--pp-info)]/10 border border-[var(--pp-info)]/30 flex items-center justify-center text-[var(--pp-info)] font-medium text-xs">2</span>
                <span>{t('step2')}</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--pp-info)]/10 border border-[var(--pp-info)]/30 flex items-center justify-center text-[var(--pp-info)] font-medium text-xs">3</span>
                <span>{t('step3')}</span>
              </li>
            </ol>

            {qrCodeDataUrl ? (
              <div className="flex flex-col items-center gap-3">
                {/* Mobile-first: tapping the otpauth:// link hands the account straight
                    to the authenticator app. Scanning is impossible when the QR code is
                    displayed on the same phone, so the link comes before the QR code. */}
                {otpAuthUrl && (
                  <a
                    href={otpAuthUrl}
                    className="sm:hidden w-full text-center px-4 py-3 rounded-lg bg-[var(--pp-info)] text-white font-medium"
                  >
                    {t('openInApp')}
                  </a>
                )}

                <p className="sm:hidden text-xs text-[var(--pp-muted)]">{t('orScanFromAnother')}</p>

                <div className="p-3 bg-white rounded-xl border border-[var(--pp-line)] shadow-sm">
                  <Image
                    src={qrCodeDataUrl}
                    alt="QR code 2FA"
                    width={200}
                    height={200}
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualKey(!showManualKey)}
                  className="text-xs text-[var(--pp-muted)] hover:text-[var(--pp-info)] underline"
                >
                  {t('showManualKey')}
                </button>
                {showManualKey && secret && (
                  <div className="flex flex-col items-center gap-2">
                    <code className="text-xs bg-[var(--pp-bg)] border border-[var(--pp-line)] rounded px-3 py-2 tracking-widest select-all">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(secret)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="text-xs text-[var(--pp-info)] underline"
                    >
                      {copied ? t('copied') : t('copyKey')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[var(--pp-info)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                  {t('verificationCode')}
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('codePlaceholderSpaced')}
                  required
                  autoComplete="one-time-code"
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>
              <Button type="submit" disabled={loading || !qrCodeDataUrl} className="w-full" size="md">
                {loading ? t('verifying') : t('enable')}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
