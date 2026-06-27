'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'

export default function TwoFactorChallengePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Already verified → go to dashboard
  useEffect(() => {
    if (session?.user?.twoFactorVerified) {
      router.replace('/admin/dashboard')
    }
  }, [session?.user?.twoFactorVerified, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/2fa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json() as { success?: boolean; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Code invalide.')
        setCode('')
        return
      }

      await update({ twoFactorVerified: true })
      router.replace('/admin/dashboard')
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="lg" useThemeVar />
          <p className="text-[var(--pp-muted)] mt-2">Vérification en deux étapes</p>
        </div>

        <Card>
          <div className="space-y-5">
            <div>
              <h1 className="text-lg font-semibold text-[var(--pp-ink)]">
                Code d&rsquo;authentification
              </h1>
              <p className="text-sm text-[var(--pp-muted)] mt-1">
                Entrez le code à 6 chiffres affiché dans votre application d&rsquo;authentification.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]*"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123 456"
                required
                autoFocus
                autoComplete="one-time-code"
                className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />

              <Button type="submit" disabled={loading} className="w-full" size="md">
                {loading ? 'Vérification...' : 'Vérifier'}
              </Button>
            </form>

            <div className="pt-2 border-t border-[var(--pp-line)] text-center">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm text-[var(--pp-muted)] hover:text-[var(--pp-ink)] underline"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
