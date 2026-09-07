'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'
import { fireSignupConversion } from '@/components/GoogleAdsTag'

export default function SignupPage() {
  const t = useTranslations('auth.signup')
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, companyName }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('signupError'))
        setLoading(false)
        return
      }

      await fireSignupConversion(data.companyId)
      setSuccess(t('success'))

      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.ok) {
        // Hard navigation: avoids the Next.js router cache serving the pre-auth state.
        // The admin layout then routes to /admin/onboarding until it is completed.
        window.location.href = '/admin/dashboard'
      } else {
        router.push('/login')
      }
    } catch {
      setError(t('signupRetryError'))
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]'

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4" suppressHydrationWarning>
      <div className="w-full max-w-md py-10" suppressHydrationWarning>
        <div className="text-center mb-8" suppressHydrationWarning>
          <Link href="/" aria-label="Pointon — accueil">
            <Logo size="lg" useThemeVar />
          </Link>
          <p className="text-[var(--pp-muted)] mt-2">{t('header')}</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5" suppressHydrationWarning>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                {success}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div suppressHydrationWarning>
                <label htmlFor="firstName" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                  {t('firstName')}
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder={t('phFirstName')}
                  required
                  className={inputCls}
                />
              </div>

              <div suppressHydrationWarning>
                <label htmlFor="lastName" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                  {t('lastName')}
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder={t('phLastName')}
                  required
                  className={inputCls}
                />
              </div>
            </div>

            <div suppressHydrationWarning>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('phEmail')}
                required
                className={inputCls}
              />
            </div>

            <div suppressHydrationWarning>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--pp-muted)] hover:text-[var(--pp-ink)]"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-[var(--pp-muted)] mt-1">{t('minChars')}</p>
            </div>

            <div suppressHydrationWarning>
              <label htmlFor="companyName" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                {t('companyName')}
              </label>
              <input
                id="companyName"
                type="text"
                autoComplete="organization"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder={t('phCompany')}
                required
                className={inputCls}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="md">
              {loading ? t('submitting') : t('createFreeBtn')}
            </Button>

            <p className="text-xs text-center text-[var(--pp-muted)]">
              {t.rich('terms', {
                terms: (c) => <Link href="/legal/terms" className="underline hover:text-[var(--pp-info)]">{c}</Link>,
                privacy: (c) => <Link href="/legal/privacy" className="underline hover:text-[var(--pp-info)]">{c}</Link>,
              })}
            </p>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--pp-line)] text-center text-sm text-[var(--pp-muted)]">
            {t('alreadyAccountQ')}{' '}
            <Link href="/login" className="text-[var(--pp-info)] font-medium hover:underline">
              {t('loginLink')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
