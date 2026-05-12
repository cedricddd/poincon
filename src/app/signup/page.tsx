'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
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
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (!companyVAT.match(/^BE\d{10}$/)) {
      setError('Numéro de TVA invalide (format: BE + 10 chiffres)')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          companyName,
          companyAddress,
          companyVAT,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription")
        setLoading(false)
        return
      }

      setSuccess('Inscription réussie! Connexion en cours...')

      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.ok) {
        router.push('/admin/dashboard')
      } else {
        router.push('/login')
      }
    } catch (err) {
      setError("Erreur lors de l'inscription. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4" suppressHydrationWarning>
      <div className="w-full max-w-2xl" suppressHydrationWarning>
        <div className="text-center mb-8" suppressHydrationWarning>
          <Link href="/" className="text-3xl font-bold text-[var(--pp-ink)]">
            PoinçOn
          </Link>
          <p className="text-[var(--pp-muted)] mt-2">Inscription administrateur</p>
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

            <div className="border-b border-[var(--pp-line)] pb-6">
              <h3 className="text-sm font-semibold text-[var(--pp-ink)] mb-4">Informations administrateur</h3>
              
              <div className="space-y-4">
                <div suppressHydrationWarning>
                  <label htmlFor="name" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Nom complet *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Votre nom"
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>

                <div suppressHydrationWarning>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Email *
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

                <div suppressHydrationWarning>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Mot de passe *
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
                  <p className="text-xs text-[var(--pp-muted)] mt-1">Minimum 8 caractères</p>
                </div>

                <div suppressHydrationWarning>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Confirmer le mot de passe *
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

            <div>
              <h3 className="text-sm font-semibold text-[var(--pp-ink)] mb-4">Informations société</h3>
              
              <div className="space-y-4">
                <div suppressHydrationWarning>
                  <label htmlFor="companyName" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Nom de la société *
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Acme Inc."
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>

                <div suppressHydrationWarning>
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Adresse *
                  </label>
                  <input
                    id="companyAddress"
                    type="text"
                    value={companyAddress}
                    onChange={e => setCompanyAddress(e.target.value)}
                    placeholder="Rue Example 123, 1000 Bruxelles"
                    required
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>

                <div suppressHydrationWarning>
                  <label htmlFor="companyVAT" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Numéro de TVA *
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
                  <p className="text-xs text-[var(--pp-muted)] mt-1">Format: BE + 10 chiffres</p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="md">
              {loading ? "Inscription en cours..." : "S'inscrire"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--pp-line)] text-center text-sm text-[var(--pp-muted)]">
            Vous avez déjà un compte?{' '}
            <Link href="/login" className="text-[var(--pp-info)] font-medium hover:underline">
              Se connecter
            </Link>
          </div>
        </Card>

        <div className="mt-8 p-6 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-lg backdrop-blur-sm border border-[var(--pp-info)]/20">
          <p className="text-center text-sm text-[var(--pp-muted)]">
            <strong>Administrateurs uniquement.</strong> Vous pourrez ajouter vos employés après l'inscription.
          </p>
        </div>
      </div>
    </div>
  )
}
