'use client'

import { useState } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { useSession } from 'next-auth/react'

export default function SuperAdminProfilePage() {
  const { data: session } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la mise à jour')
      } else {
        setSuccess('Mot de passe mis à jour avec succès')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-[var(--pp-ink)] mb-6">Mon profil</h1>

      <Card>
        <div className="mb-6 pb-6 border-b border-[var(--pp-line)]">
          <p className="text-sm text-[var(--pp-muted)] mb-1">Compte connecté</p>
          <p className="font-medium text-[var(--pp-ink)]">{session?.user?.name}</p>
          <p className="text-sm text-[var(--pp-muted)]">{session?.user?.email}</p>
          <span className="inline-block mt-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
            SUPER ADMIN
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--pp-ink)]">Changer le mot de passe</h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
            <p className="text-xs text-[var(--pp-muted)] mt-1">Minimum 8 caractères</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>

          <Button type="submit" disabled={loading} size="md">
            {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
