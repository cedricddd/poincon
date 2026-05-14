'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

export default function InviteUserPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', name: '', role: 'EMPLOYEE' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur lors de l\'envoi.'); return }
      setSuccess(true)
      setTimeout(() => router.push('/admin/dashboard/users'), 2500)
    } catch {
      setError('Erreur lors de l\'envoi de l\'invitation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Inviter un employé</h1>
        <p className="text-[var(--pp-muted)] text-sm mt-1">
          Un email avec un lien d'activation (valable 48h) sera envoyé à l'adresse indiquée.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✅ Invitation envoyée ! Redirection…
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
              Email <span className="text-[var(--pp-neg)]">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="employe@entreprise.be"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
              Nom (optionnel)
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Prénom Nom"
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
            <p className="text-xs text-[var(--pp-muted)] mt-1">L'employé pourra le modifier lors de son inscription.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Rôle</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
            >
              <option value="EMPLOYEE">Employé</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || success} size="md">
              {loading ? 'Envoi…' : 'Envoyer l\'invitation'}
            </Button>
            <Button type="button" variant="outline" size="md" onClick={() => router.push('/admin/dashboard/users')}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
