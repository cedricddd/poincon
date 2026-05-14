'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { useParams, useRouter } from 'next/navigation'

interface CompanyDetail {
  id: string
  name: string
  domain?: string
  adminEmail: string
  adminName?: string
  contactEmail?: string
  marketingConsent: boolean
  plan: string
  billingCycle?: string
  activeMembers: number
  maxEmployees: number
  createdAt: string
  planExpiresAt?: string
}

interface FeatureFlag {
  id: string
  flag: string
  enabled: boolean
}

export default function AccountDetail() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [editPlan, setEditPlan] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/super-admin/accounts`)
        if (res.ok) {
          const accounts = await res.json()
          const found = accounts.find((a: any) => a.id === id)
          if (found) {
            setCompany(found)
            setEditPlan(found.plan)
            setContactEmail(found.contactEmail || '')
          }
        }
      } catch (error) {
        console.error('Failed to load company:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  const handlePlanChange = async () => {
    if (!editPlan || editPlan === company?.plan) return

    const res = await fetch(`/api/super-admin/accounts/${id}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planName: editPlan,
        reason: 'Changed by super-admin',
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setCompany(updated)
      alert(`Plan changé à ${editPlan}`)
    }
  }

  const handleFeatureFlagToggle = async (flag: string, enabled: boolean) => {
    const res = await fetch(`/api/super-admin/accounts/${id}/feature-flag`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag, enabled: !enabled }),
    })

    if (res.ok) {
      const updated = await res.json()
      setFlags(flags.map((f) => (f.flag === flag ? { ...f, enabled: !enabled } : f)))
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous sûr ? Cela supprimera le compte ${company?.name}`)) return

    const res = await fetch('/api/super-admin/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: id }),
    })

    if (res.ok) {
      alert('Compte supprimé')
      router.push('/super-admin/accounts')
    }
  }

  if (loading) return <p className="p-6 text-[var(--pp-muted)]">Chargement...</p>
  if (!company) return <p className="p-6 text-[#ef4444]">Compte non trouvé</p>

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[var(--pp-ink)]">{company.name}</h1>
          <p className="text-[var(--pp-muted)] mt-1">
            Créé {new Date(company.createdAt).toLocaleDateString('fr-BE')}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm hover:opacity-90"
        >
          Supprimer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Informations</h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-[var(--pp-muted)] block mb-1">Email admin</label>
              <p className="font-mono">{company.adminEmail}</p>
            </div>
            <div>
              <label className="text-[var(--pp-muted)] block mb-1">Email contact</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={company.marketingConsent}
                  onChange={(e) => {
                    fetch(`/api/super-admin/accounts/${id}/contact`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ marketingConsent: e.target.checked }),
                    }).then(() => {
                      setCompany({ ...company, marketingConsent: e.target.checked })
                    })
                  }}
                  className="rounded"
                />
                <span className="text-[var(--pp-muted)]">Consentement marketing</span>
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Plan & Quotas</h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-[var(--pp-muted)] block mb-1">Plan actuel</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="px-3 py-2 border border-[var(--pp-line)] rounded-lg w-full"
              >
                <option>FREE</option>
                <option>SOLO</option>
                <option>TEAM</option>
                <option>ENTERPRISE</option>
              </select>
              {editPlan !== company.plan && (
                <button
                  onClick={handlePlanChange}
                  className="mt-2 w-full px-3 py-2 bg-[#6366f1] text-white rounded-lg text-xs hover:opacity-90"
                >
                  Appliquer le changement
                </button>
              )}
            </div>
            {company.billingCycle && (
              <div>
                <label className="text-[var(--pp-muted)] block mb-1">Cycle de facturation</label>
                <p className="text-lg font-bold">
                  {company.billingCycle === 'monthly' ? '📅 Mensuel' : '📆 Annuel'}
                </p>
              </div>
            )}
            <div>
              <label className="text-[var(--pp-muted)] block mb-1">Utilisateurs actifs</label>
              <p className="text-lg font-bold">
                {company.activeMembers}{' '}
                <span className="text-xs font-normal text-[var(--pp-muted)]">
                  / {company.maxEmployees === -1 ? '∞' : company.maxEmployees}
                </span>
              </p>
              {company.activeMembers > company.maxEmployees && company.maxEmployees !== -1 && (
                <p className="text-xs text-[#ef4444] mt-1">
                  ⚠️ Dépassement de {company.activeMembers - company.maxEmployees} utilisateurs
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Feature Flags</h2>
        <p className="text-xs text-[var(--pp-muted)] mb-4">
          Gérez les fonctionnalités expérimentales pour ce compte
        </p>
        <div className="space-y-2">
          {['early_access_api', 'extended_export', 'custom_reports'].map((flag) => (
            <label
              key={flag}
              className="flex items-center gap-3 p-3 border border-[var(--pp-line)] rounded-lg cursor-pointer hover:bg-[var(--pp-bg2)]"
            >
              <input
                type="checkbox"
                checked={flags.find((f) => f.flag === flag)?.enabled || false}
                onChange={(e) => handleFeatureFlagToggle(flag, e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-mono">{flag}</span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}
