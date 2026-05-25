'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

export default function ForgotPasswordPage() {
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
      if (!res.ok) { setError(data.error ?? 'Erreur.'); setStatus('idle'); return }
      setStatus('done')
    } catch {
      setError('Erreur réseau. Réessayez.')
      setStatus('idle')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-[var(--pp-ink)]">PoinçOn</Link>
          <p className="text-[var(--pp-muted)] mt-2">Mot de passe oublié</p>
        </div>

        <Card>
          {status === 'done' ? (
            <div className="text-center py-4 space-y-4">
              <p className="text-4xl">📧</p>
              <p className="font-semibold text-[var(--pp-ink)]">Email envoyé !</p>
              <p className="text-sm text-[var(--pp-muted)]">
                Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation valable 24 heures.
              </p>
              <p className="text-sm text-[var(--pp-muted)]">Pensez à vérifier vos spams.</p>
              <Link href="/login" className="text-[var(--pp-info)] text-sm hover:underline block">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-[var(--pp-muted)]">
                Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  autoFocus
                  className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>

              <Button type="submit" disabled={status === 'loading'} className="w-full" size="md">
                {status === 'loading' ? 'Envoi…' : 'Envoyer le lien'}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-[var(--pp-muted)] text-sm hover:text-[var(--pp-ink)] hover:underline">
                  ← Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
