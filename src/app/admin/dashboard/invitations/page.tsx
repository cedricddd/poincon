'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { showToast } from '@/hooks/useToast'

interface Invitation {
  id: string
  email: string
  name: string | null
  role: string
  token: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
}

function getStatus(inv: Invitation): 'used' | 'expired' | 'pending' {
  if (inv.usedAt) return 'used'
  if (new Date(inv.expiresAt) < new Date()) return 'expired'
  return 'pending'
}

const STATUS_LABELS = {
  used: { label: 'Utilisée', cls: 'bg-green-100 text-green-700' },
  expired: { label: 'Expirée', cls: 'bg-gray-100 text-gray-500' },
  pending: { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
}

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employé',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    const res = await fetch('/api/admin/invitations')
    if (res.ok) setInvitations(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchInvitations() }, [fetchInvitations])

  const cancel = async (id: string) => {
    if (!confirm('Annuler cette invitation ?')) return
    setActing(id)
    const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Invitation annulée', 'success')
      setInvitations(prev => prev.filter(i => i.id !== id))
    } else {
      showToast('Erreur', 'error')
    }
    setActing(null)
  }

  const resend = async (id: string) => {
    setActing(id)
    const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'PATCH' })
    if (res.ok) {
      showToast('Invitation renvoyée', 'success')
      fetchInvitations()
    } else {
      const data = await res.json()
      showToast(data.error ?? 'Erreur', 'error')
    }
    setActing(null)
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/set-password?token=${token}`
    navigator.clipboard.writeText(url)
    showToast('Lien copié', 'success')
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) return <div className="p-8 text-center text-[var(--pp-muted)]">Chargement…</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Invitations</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-1">
            {invitations.filter(i => getStatus(i) === 'pending').length} en attente · {invitations.length} au total
          </p>
        </div>
        <Link
          href="/admin/dashboard/users/invite"
          className="px-4 py-2 bg-[var(--pp-info)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          + Inviter
        </Link>
      </div>

      {invitations.length === 0 ? (
        <div className="bg-white border border-[var(--pp-line)] rounded-xl p-8 text-center text-[var(--pp-muted)] text-sm">
          Aucune invitation envoyée.
        </div>
      ) : (
        <div className="bg-white border border-[var(--pp-line)] rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--pp-line)] bg-[var(--pp-bg)] text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide">
            <span>Destinataire</span>
            <span>Rôle</span>
            <span>Statut</span>
            <span>Expiration</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-[var(--pp-line)]">
            {invitations.map(inv => {
              const status = getStatus(inv)
              const { label, cls } = STATUS_LABELS[status]
              const isActing = acting === inv.id
              return (
                <div key={inv.id} className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center gap-2 md:gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--pp-ink)] truncate">{inv.email}</p>
                    {inv.name && <p className="text-xs text-[var(--pp-muted)]">{inv.name}</p>}
                  </div>
                  <span className="text-xs text-[var(--pp-muted)] shrink-0">{ROLE_LABELS[inv.role] ?? inv.role}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cls}`}>{label}</span>
                  <span className="text-xs text-[var(--pp-muted)] shrink-0 whitespace-nowrap">
                    {status === 'used'
                      ? `Utilisée le ${fmtDate(inv.usedAt!)}`
                      : `Expire le ${fmtDate(inv.expiresAt)}`}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    {status !== 'used' && (
                      <>
                        <button
                          onClick={() => copyLink(inv.token)}
                          title="Copier le lien"
                          className="px-3 py-1.5 text-xs bg-[var(--pp-bg)] border border-[var(--pp-line)] text-[var(--pp-muted)] rounded-lg hover:text-[var(--pp-ink)] transition-colors"
                        >
                          Copier lien
                        </button>
                        <button
                          onClick={() => resend(inv.id)}
                          disabled={isActing}
                          title="Renvoyer l'email"
                          className="px-3 py-1.5 text-xs bg-[var(--pp-info)]/10 text-[var(--pp-info)] rounded-lg hover:bg-[var(--pp-info)]/20 disabled:opacity-50 transition-colors"
                        >
                          Renvoyer
                        </button>
                        <button
                          onClick={() => cancel(inv.id)}
                          disabled={isActing}
                          title="Annuler l'invitation"
                          className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
