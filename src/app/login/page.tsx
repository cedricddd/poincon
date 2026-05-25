'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

interface CompanyInfo {
  name: string
  logoUrl: string | null
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
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
        setError(result.error || 'Erreur de connexion.')
      } else if (result?.ok) {
        router.push('/app/clock')
      }
    } catch {
      setError('Erreur de connexion. Vérifiez vos identifiants.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4" suppressHydrationWarning>
      <div className="w-full max-w-lg" suppressHydrationWarning>

        {/* Header: logo société ou branding PoinçOn */}
        <div className="text-center mb-8 transition-all duration-300" suppressHydrationWarning>
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
                <p className="text-sm text-[var(--pp-muted)]">Connexion via PoinçOn</p>
              </div>
            </div>
          ) : (
            <>
              <Link href="/" className="text-3xl font-bold text-[var(--pp-ink)]">
                PoinçOn
              </Link>
              <p className="text-[var(--pp-muted)] mt-2">Connexion à votre compte</p>
            </>
          )}
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div suppressHydrationWarning>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (!e.target.value) setCompany(null) }}
                onBlur={handleEmailBlur}
                placeholder="vous@entreprise.be"
                required
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <div suppressHydrationWarning>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                Mot de passe
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
                Se souvenir de moi
              </label>
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="md">
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>

            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-[var(--pp-muted)] hover:text-[var(--pp-info)] hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--pp-line)] text-center text-sm text-[var(--pp-muted)]">
            Pas de compte?{' '}
            <Link href="/signup" className="text-[var(--pp-info)] font-medium hover:underline">
              S'inscrire gratuitement
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
