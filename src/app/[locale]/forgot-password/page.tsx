'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('loading')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t('error')); setStatus('idle'); return }
      setStatus('done')
    } catch {
      setError(t('networkError'))
      setStatus('idle')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" aria-label="Pointon — accueil"><Logo size="lg" useThemeVar /></Link>
          <p className="text-[var(--pp-muted)] mt-2">{t('title')}</p>
        </div>

        <Card>
          {status === 'done' ? (
            <div className="text-center py-4 space-y-4">
              <p className="text-4xl">📧</p>
              <p className="font-semibold text-[var(--pp-ink)]">{t('emailSent')}</p>
              <p className="text-sm text-[var(--pp-muted)]">
                {t.rich('sentInfo', { b: (c) => <strong>{c}</strong>, email })}
              </p>
              <p className="text-sm text-[var(--pp-muted)]">{t('checkSpam')}</p>
              <Link href="/login" className="text-[var(--pp-info)] text-sm hover:underline block">
                {t('backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-[var(--pp-muted)]">
                {t('formDescription')}
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('emailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  required
                  autoFocus
                  className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>

              <Button type="submit" disabled={status === 'loading'} className="w-full" size="md">
                {status === 'loading' ? t('sending') : t('submit')}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-[var(--pp-muted)] text-sm hover:text-[var(--pp-ink)] hover:underline">
                  {t('backToLoginArrow')}
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
