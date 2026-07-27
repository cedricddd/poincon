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
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyVAT, setCompanyVAT] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      setLoading(false)
      return
    }

    if (!companyVAT.match(/^BE\d{10}$/)) {
      setError(t('invalidVat'))
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          companyName,
          companyAddress,
          companyVAT,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('signupError'))
        setLoading(false)
        return
      }

      fireSignupConversion(data.companyId)
      setSuccess(t('success'))

      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.ok) {
        router.refresh()
        router.push('/admin/dashboard')
      } else {
        router.push('/login')
      }
    } catch {
      setError(t('signupRetryError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4" suppressHydrationWarning>
      <div className="w-full max-w-2xl py-10" suppressHydrationWarning>
        <div className="text-center mb-8" suppressHydrationWarning>
          <Link href="/" aria-label="Pointon — accueil">
            <Logo size="lg" useThemeVar />
          </Link>
          <p className="text-[var(--pp-muted)] mt-2">{t('header')}</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
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

            {/* Section administrateur */}
            <div className="border-b border-[var(--pp-line)] pb-6">
              <h3 className="text-sm font-semibold text-[var(--pp-ink)] mb-4">{t('personalInfo')}</h3>

              <div className="grid grid-cols-2 gap-4">
                <div suppressHydrationWarning>
                  <label htmlFor="firstName" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    {t('firstName')}
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder={t('phFirstName')}
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>

                <div suppressHydrationWarning>
                  <label htmlFor="lastName" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    {t('lastName')}
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder={t('phLastName')}
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div suppressHydrationWarning>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    {t('email')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('phEmail')}
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>

                <div suppressHydrationWarning>
                  <label htmlFor="phone" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    {t('phone')}
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={t('phPhone')}
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div suppressHydrationWarning>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    {t('password')}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                  <p className="text-xs text-[var(--pp-muted)] mt-1">{t('minChars')}</p>
                </div>

                <div suppressHydrationWarning>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    {t('confirmPassword')}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>
              </div>
            </div>

            {/* Section société */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--pp-ink)] mb-4">{t('companyInfo')}</h3>

              <div className="space-y-4">
                <div suppressHydrationWarning>
                  <label htmlFor="companyName" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    {t('companyName')}
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder={t('phCompany')}
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>

                <div suppressHydrationWarning>
                  <label htmlFor="companyVAT" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    {t('vatNumber')}
                  </label>
                  <input
                    id="companyVAT"
                    type="text"
                    value={companyVAT}
                    onChange={e => setCompanyVAT(e.target.value.toUpperCase())}
                    placeholder="BE0123456789"
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                  <p className="text-xs text-[var(--pp-muted)] mt-1">{t('vatFormat')}</p>
                </div>

                <div suppressHydrationWarning>
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    {t('address')}
                  </label>
                  <input
                    id="companyAddress"
                    type="text"
                    required
                    value={companyAddress}
                    onChange={e => setCompanyAddress(e.target.value)}
                    placeholder={t('phAddress')}
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>
              </div>
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
