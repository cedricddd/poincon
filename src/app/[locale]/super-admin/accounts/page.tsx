'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

interface Account {
  id: string
  name: string
  adminEmail: string
  adminName?: string
  contactEmail?: string
  plan: string
  activeMembers: number
  maxEmployees: number
  isOverQuota: boolean
  isInternal: boolean
  isDemo: boolean
  lastActivityAt: string | null
  createdAt: string
  planExpiresAt: string | null
}

export default function SuperAdminAccounts() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan') || 'ALL')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [showInternal, setShowInternal] = useState(false)

  useEffect(() => {
    const loadAccounts = async () => {
      const params = new URLSearchParams()
      if (planFilter !== 'ALL') params.append('plan', planFilter)
      if (statusFilter) params.append('status', statusFilter)
      if (showInternal) params.append('internal', 'true')

      const res = await fetch(`/api/super-admin/accounts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
      }
      setLoading(false)
    }

    loadAccounts()
  }, [planFilter, statusFilter, showInternal])

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('fr-BE')
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--pp-ink)]">Comptes Clients</h1>
        <p className="text-[var(--pp-muted)] mt-1">Gestion et monitoring de tous les comptes</p>
      </div>

      <Card>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-xs font-semibold text-[var(--pp-muted)] block mb-2">
              Filtrer par plan
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm"
            >
              <option value="ALL">Tous les plans</option>
              <option value="FREE">FREE</option>
              <option value="SOLO">SOLO</option>
              <option value="TEAM">TEAM</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--pp-muted)] block mb-2">
              Filtrer par statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="OVER_QUOTA">Dépassent quota</option>
              <option value="GHOST">Inactifs 90j</option>
              <option value="UNPAID">Sans paiement</option>
            </select>
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--pp-muted)]">
              <input
                type="checkbox"
                checked={showInternal}
                onChange={(e) => setShowInternal(e.target.checked)}
                className="rounded"
              />
              Afficher les comptes internes
            </label>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="text-center text-[var(--pp-muted)] py-4">Chargement...</p>
        ) : accounts.length === 0 ? (
          <p className="text-center text-[var(--pp-muted)] py-4">Aucun compte trouvé</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pp-line)] text-[var(--pp-muted)]">
                  <th className="text-left font-semibold py-3 px-4">Société</th>
                  <th className="text-left font-semibold py-3 px-4">Contact</th>
                  <th className="text-left font-semibold py-3 px-4">Plan</th>
                  <th className="text-center font-semibold py-3 px-4">Usage</th>
                  <th className="text-left font-semibold py-3 px-4">Dernière activité</th>
                  <th className="text-center font-semibold py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pp-line)]">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[var(--pp-bg2)]">
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        {acc.name}
                        {acc.isInternal && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#7c3aed20] text-[#7c3aed] rounded">INT</span>
                        )}
                        {acc.isDemo && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f59e0b20] text-[#f59e0b] rounded">DEMO</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--pp-muted)] text-xs">
                      {acc.adminEmail}
                      {acc.contactEmail && <div className="text-[0.7rem]">{acc.contactEmail}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--pp-info)]/10 text-[var(--pp-info)]">
                        {acc.plan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs font-mono ${acc.isOverQuota ? 'text-[#ef4444]' : 'text-[var(--pp-muted)]'}`}>
                        {acc.activeMembers}/{acc.maxEmployees === -1 ? '∞' : acc.maxEmployees}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--pp-muted)]">
                      {formatDate(acc.lastActivityAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link href={`/super-admin/accounts/${acc.id}`}>
                        <Button variant="outline" size="sm">
                          Voir
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
