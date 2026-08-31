'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

interface CompanyInfo {
  name: string
  logoUrl: string | null
}

export default function LoginPage() {
  const t = useTranslations('auth.login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('rememberedEmail')
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
  }, [])
  const [error, setError] = useState('')
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  const lookupCompany = useCallback(async (value: string) => {
    if (!value.includes('@') || !value.includes('.')) return
    setLookingUp(true)
    try {
      const res = await fetch(`/api/auth/company-lookup?email=${encodeURIComponent(value)}`)
      const data = await res.json()
      setCompany(data)
    } catch {
      setCompany(null)
    } finally {
      setLookingUp(false)
    }
  }, [])

  const handleEmailBlur = () => lookupCompany(email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        rememberMe: rememberMe.toString(),
        redirect: false,
      })

      if (result?.error) {
        setError(
          result.error === 'CredentialsSignin'
            ? t('errorInvalid')
            : result.error === 'TooManyAttempts'
              ? t('errorBrute')
              : t('errorUnavailable')
        )
      } else if (result?.ok) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email)
        } else {
          localStorage.removeItem('rememberedEmail')
        }
        // Hard navigation: avoids the Next.js router cache serving the pre-auth state.
        window.location.href = '/app/clock'
      }
    } catch {
      setError(t('errorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="absolute top-4 right-4 w-40">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-lg">

        {/* Header: logo société ou branding Pointon */}
        <div className="text-center mb-8 transition-all duration-300">
          {company ? (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              {company.logoUrl ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[var(--pp-line)] bg-white shadow-sm flex items-center justify-center">
                  <Image
                    src={company.logoUrl}
                    alt={company.name}
                    width={80}
                    height={80}
                    className="object-contain w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[var(--pp-info)]/10 border border-[var(--pp-info)]/20 flex items-center justify-center text-2xl">
                  🏢
                </div>
              )}
              <div>
                <p className="text-xl font-semibold text-[var(--pp-ink)]">{company.name}</p>
                <p className="text-sm text-[var(--pp-muted)]">{t('via')}</p>
              </div>
            </div>
          ) : (
            <>
              <Link href="/" aria-label="Pointon — accueil">
                <Logo size="lg" useThemeVar />
              </Link>
              <p className="text-[var(--pp-muted)] mt-2">{t('subtitle')}</p>
            </>
          )}
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* suppressHydrationWarning: password managers (pCloud Pass, LastPass…)
                inject attributes/nodes into credential fields before hydration. */}
            <div suppressHydrationWarning>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (!e.target.value) setCompany(null) }}
                onBlur={handleEmailBlur}
                placeholder={t('emailPlaceholder')}
                required
                suppressHydrationWarning
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <div suppressHydrationWarning>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                {t('passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                required
                suppressHydrationWarning
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 border border-[var(--pp-line)] rounded"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-[var(--pp-muted)]">
                {t('rememberMe')}
              </label>
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="md">
              {loading ? t('submitting') : t('submit')}
            </Button>

            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-[var(--pp-muted)] hover:text-[var(--pp-info)] hover:underline">
                {t('forgotPassword')}
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--pp-line)] text-center text-sm text-[var(--pp-muted)]">
            {t('noAccount')}{' '}
            <Link href="/signup" className="text-[var(--pp-info)] font-medium hover:underline">
              {t('signup')}
            </Link>
          </div>
        </Card>

        <div className="text-center mt-4">
          <Link href="/" className="text-sm text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:underline transition-colors">
            ← {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
