'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'valid' | 'error' | 'done'>('loading')
  const [invitation, setInvitation] = useState<{ email: string; name: string | null } | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [tokenError, setTokenError] = useState('')

  useEffect(() => {
    if (!token) { setTokenError('Lien invalide.'); setStatus('error'); return }
    fetch(`/api/auth/set-password?token=${encodeURIComponent(token)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) { setTokenError(data.error ?? 'Lien invalide.'); setStatus('error'); return }
        setInvitation(data)
        setName(data.name ?? '')
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
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return }

      setStatus('done')
      const result = await signIn('credentials', { email: data.email, password, redirect: false })
      if (result?.ok) router.push('/app/clock')
    } catch {
      setError('Erreur lors de la création du compte.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" aria-label="Pointon — accueil"><Logo size="lg" useThemeVar /></Link>
          <p className="text-[var(--pp-muted)] mt-2">Créer votre compte</p>
        </div>

        {status === 'loading' && (
          <Card><p className="text-center text-[var(--pp-muted)] py-6">Vérification du lien…</p></Card>
        )}

        {status === 'error' && (
          <Card>
            <div className="text-center py-4 space-y-4">
              <p className="text-4xl">⚠️</p>
              <p className="text-[var(--pp-neg)] font-medium">{tokenError}</p>
              <p className="text-sm text-[var(--pp-muted)]">Ce lien est peut-être expiré ou déjà utilisé. Contactez votre administrateur.</p>
              <Link href="/login" className="text-[var(--pp-info)] text-sm hover:underline">Retour à la connexion</Link>
            </div>
          </Card>
        )}

        {status === 'done' && (
          <Card>
            <div className="text-center py-4 space-y-3">
              <p className="text-4xl">✅</p>
              <p className="font-semibold text-[var(--pp-ink)]">Compte créé !</p>
              <p className="text-sm text-[var(--pp-muted)]">Connexion en cours…</p>
            </div>
          </Card>
        )}

        {status === 'valid' && invitation && (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="pb-2 border-b border-[var(--pp-line)]">
                <p className="text-sm text-[var(--pp-muted)]">Invitation pour</p>
                <p className="font-semibold text-[var(--pp-ink)]">{invitation.email}</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Votre nom</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Prénom Nom"
                  required
                  className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  required
                  minLength={8}
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
                {submitting ? 'Création…' : 'Créer mon compte'}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center">
        <p className="text-[var(--pp-muted)]">Chargement…</p>
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  )
}
