'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // TODO: Implement NextAuth login
      console.log('Login attempt', { email, password })
    } catch (err) {
      setError('Erreur de connexion. Vérifiez vos identifiants.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-[var(--pp-ink)]">
            PoinçOn
          </Link>
          <p className="text-[var(--pp-muted)] mt-2">Connexion à votre compte</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@entreprise.be"
                required
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <div>
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
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--pp-line)] text-center text-sm text-[var(--pp-muted)]">
            Pas de compte?{' '}
            <Link href="/signup" className="text-[var(--pp-info)] font-medium hover:underline">
              S'inscrire gratuitement
            </Link>
          </div>
        </Card>

        <div className="mt-8 p-6 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-lg backdrop-blur-sm border border-[var(--pp-info)]/20">
          <p className="text-center text-sm text-[var(--pp-muted)]">
            <strong>Application en développement.</strong> Fonctionnalité de connexion en cours d'implémentation.
          </p>
        </div>
      </div>
    </div>
  )
}
