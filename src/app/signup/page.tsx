'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      // TODO: Implement NextAuth signup
      console.log('Signup attempt', formData)
    } catch (err) {
      setError('Erreur lors de l\'inscription.')
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
          <p className="text-[var(--pp-muted)] mt-2">Créer votre compte gratuitement</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                Nom complet
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Votre nom"
                required
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                Entreprise
              </label>
              <input
                id="company"
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Nom de l'entreprise"
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                Email professionnel
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                Confirmez le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="md">
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--pp-line)] text-center text-sm text-[var(--pp-muted)]">
            Vous avez déjà un compte?{' '}
            <Link href="/login" className="text-[var(--pp-info)] font-medium hover:underline">
              Se connecter
            </Link>
          </div>
        </Card>

        <div className="mt-8 p-4 bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-lg backdrop-blur-sm border border-[var(--pp-pos)]/20 text-center text-sm text-[var(--pp-muted)]">
          <p><strong>Plan Free.</strong> Commencez sans frais. Aucune carte requise.</p>
        </div>
      </div>
    </div>
  )
}
