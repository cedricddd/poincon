'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'valid' | 'error' | 'done'>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [tokenError, setTokenError] = useState('')

  useEffect(() => {
    if (!token) { setTokenError('Lien invalide.'); setStatus('error'); return }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) { setTokenError(data.error ?? 'Lien invalide.'); setStatus('error'); return }
        setEmail(data.email)
        setStatus('valid')
      })
      .catch(() => { setTokenError('Erreur réseau.'); setStatus('error') })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return }

      setStatus('done')
      const result = await signIn('credentials', { email: data.email, password, redirect: false })
      if (result?.ok) router.push('/app/clock')
    } catch {
      setError('Erreur lors de la réinitialisation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-[var(--pp-ink)]">PoinçOn</Link>
          <p className="text-[var(--pp-muted)] mt-2">Nouveau mot de passe</p>
        </div>

        {status === 'loading' && (
          <Card><p className="text-center text-[var(--pp-muted)] py-6">Vérification du lien…</p></Card>
        )}

        {status === 'error' && (
          <Card>
            <div className="text-center py-4 space-y-4">
              <p className="text-4xl">⚠️</p>
              <p className="text-[var(--pp-neg)] font-medium">{tokenError}</p>
              <p className="text-sm text-[var(--pp-muted)]">Ce lien est peut-être expiré ou déjà utilisé.</p>
              <Link href="/forgot-password" className="text-[var(--pp-info)] text-sm hover:underline block">
                Demander un nouveau lien
              </Link>
              <Link href="/login" className="text-[var(--pp-muted)] text-sm hover:underline block">
                Retour à la connexion
              </Link>
            </div>
          </Card>
        )}

        {status === 'done' && (
          <Card>
            <div className="text-center py-4 space-y-3">
              <p className="text-4xl">✅</p>
              <p className="font-semibold text-[var(--pp-ink)]">Mot de passe mis à jour !</p>
              <p className="text-sm text-[var(--pp-muted)]">Connexion en cours…</p>
            </div>
          </Card>
        )}

        {status === 'valid' && (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="pb-2 border-b border-[var(--pp-line)]">
                <p className="text-sm text-[var(--pp-muted)]">Réinitialisation pour</p>
                <p className="font-semibold text-[var(--pp-ink)]">{email}</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  required
                  minLength={8}
                  autoFocus
                  className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full" size="md">
                {submitting ? 'Mise à jour…' : 'Enregistrer le mot de passe'}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center">
        <p className="text-[var(--pp-muted)]">Chargement…</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
