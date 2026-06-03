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
  phone?: string
  address?: string
  vatNumber?: string
  marketingConsent: boolean
  plan: string
  billingCycle?: string
  activeMembers: number
  maxEmployees: number
  createdAt: string
  planExpiresAt?: string
  enterprisePaidStatus?: string
  enterprisePlanStartedAt?: string
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
  const [planError, setPlanError] = useState('')
  const [planSuccess, setPlanSuccess] = useState('')
  const [enterprisePaidStatus, setEnterprisePaidStatus] = useState('')
  const [enterprisePlanStartedAt, setEnterprisePlanStartedAt] = useState('')
  const [enterprisePlanExpiresAt, setEnterprisePlanExpiresAt] = useState('')
  const [savingEnterprise, setSavingEnterprise] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accountsRes, flagsRes] = await Promise.all([
          fetch(`/api/super-admin/accounts`),
          fetch(`/api/super-admin/accounts/${id}/feature-flag`),
        ])
        if (accountsRes.ok) {
          const accounts = await accountsRes.json()
          const found = accounts.find((a: any) => a.id === id)
          if (found) {
            setCompany(found)
            setEditPlan(found.plan)
            setContactEmail(found.contactEmail || '')
            setEnterprisePaidStatus(found.enterprisePaidStatus || 'UNPAID')
            setEnterprisePlanStartedAt(found.enterprisePlanStartedAt ? found.enterprisePlanStartedAt.split('T')[0] : '')
            setEnterprisePlanExpiresAt(found.planExpiresAt ? found.planExpiresAt.split('T')[0] : '')
          }
        }
        if (flagsRes.ok) {
          setFlags(await flagsRes.json())
        }
      } catch (error) {
        console.error('Failed to load company:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  const reloadCompany = async () => {
    const res = await fetch(`/api/super-admin/accounts`)
    if (res.ok) {
      const accounts = await res.json()
      const found = accounts.find((a: any) => a.id === id)
      if (found) {
        setCompany(found)
        setEditPlan(found.plan)
        setEnterprisePaidStatus(found.enterprisePaidStatus || 'UNPAID')
        setEnterprisePlanStartedAt(found.enterprisePlanStartedAt ? found.enterprisePlanStartedAt.split('T')[0] : '')
        setEnterprisePlanExpiresAt(found.planExpiresAt ? found.planExpiresAt.split('T')[0] : '')
      }
    }
  }

  const handlePlanChange = async () => {
    if (!editPlan || editPlan === company?.plan) return
    setPlanError('')
    setPlanSuccess('')

    const res = await fetch(`/api/super-admin/accounts/${id}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planName: editPlan,
        reason: 'Changed by super-admin',
      }),
    })

    if (res.ok) {
      await reloadCompany()
      setPlanSuccess(`Plan changé à ${editPlan}`)
      setTimeout(() => setPlanSuccess(''), 3000)
    } else {
      const data = await res.json().catch(() => ({}))
      setPlanError(data.error || `Erreur ${res.status} — vérifiez les logs serveur`)
    }
  }

  const handleFeatureFlagToggle = async (flag: string, newEnabled: boolean) => {
    const res = await fetch(`/api/super-admin/accounts/${id}/feature-flag`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag, enabled: newEnabled }),
    })

    if (res.ok) {
      setFlags(prev => {
        const exists = prev.find(f => f.flag === flag)
        if (exists) return prev.map(f => f.flag === flag ? { ...f, enabled: newEnabled } : f)
        return [...prev, { id: flag, flag, enabled: newEnabled }]
      })
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
              <label className="text-[var(--pp-muted)] block mb-1">Administrateur</label>
              <p className="font-medium text-[var(--pp-ink)]">{company.adminName ?? '—'}</p>
              <p className="font-mono text-xs text-[var(--pp-muted)]">{company.adminEmail}</p>
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
              {planError && (
                <p className="mt-1 text-xs text-[#ef4444] bg-[#ef444415] px-2 py-1 rounded">{planError}</p>
              )}
              {planSuccess && (
                <p className="mt-1 text-xs text-[#22c55e] bg-[#22c55e15] px-2 py-1 rounded">{planSuccess}</p>
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

      {company.plan === 'ENTERPRISE' && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-1">Contrat Enterprise</h2>
          <p className="text-xs text-[var(--pp-muted)] mb-4">Géré manuellement — hors Stripe</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <label className="text-[var(--pp-muted)] block mb-1">Statut paiement</label>
              <select
                value={enterprisePaidStatus}
                onChange={(e) => setEnterprisePaidStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg"
              >
                <option value="PAID">Payé</option>
                <option value="UNPAID">Non payé</option>
                <option value="PENDING">En attente</option>
              </select>
            </div>
            <div>
              <label className="text-[var(--pp-muted)] block mb-1">Début du contrat</label>
              <input
                type="date"
                value={enterprisePlanStartedAt}
                onChange={(e) => setEnterprisePlanStartedAt(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg"
              />
            </div>
            <div>
              <label className="text-[var(--pp-muted)] block mb-1">Fin du contrat (rappel -30j)</label>
              <input
                type="date"
                value={enterprisePlanExpiresAt}
                onChange={(e) => setEnterprisePlanExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg"
              />
            </div>
          </div>
          {enterprisePlanExpiresAt && (() => {
            const expires = new Date(enterprisePlanExpiresAt)
            const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000)
            if (daysLeft <= 30 && daysLeft > 0) return (
              <p className="text-xs text-[#f59e0b] bg-[#f59e0b15] px-2 py-1 rounded mb-3">
                ⚠️ Contrat expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
              </p>
            )
            if (daysLeft <= 0) return (
              <p className="text-xs text-[#ef4444] bg-[#ef444415] px-2 py-1 rounded mb-3">
                Contrat expiré depuis {Math.abs(daysLeft)} jour{Math.abs(daysLeft) > 1 ? 's' : ''}
              </p>
            )
            return null
          })()}
          <button
            disabled={savingEnterprise}
            onClick={async () => {
              setSavingEnterprise(true)
              const res = await fetch(`/api/super-admin/accounts/${id}/plan`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  planName: 'ENTERPRISE',
                  reason: 'Enterprise details updated by super-admin',
                  enterprisePaidStatus,
                  enterprisePlanStartedAt: enterprisePlanStartedAt || undefined,
                  planExpiresAt: enterprisePlanExpiresAt || undefined,
                }),
              })
              if (res.ok) {
                await reloadCompany()
                setPlanSuccess('Contrat Enterprise mis à jour')
                setTimeout(() => setPlanSuccess(''), 3000)
              } else {
                const d = await res.json().catch(() => ({}))
                setPlanError(d.error || `Erreur ${res.status}`)
              }
              setSavingEnterprise(false)
            }}
            className="px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
          >
            {savingEnterprise ? 'Sauvegarde...' : 'Sauvegarder le contrat'}
          </button>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Facturation & Légal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Nom de la société', value: company.name },
            { label: 'Téléphone', value: company.phone },
            { label: 'Numéro de TVA', value: company.vatNumber },
            { label: 'Adresse', value: company.address },
            { label: 'Domaine email', value: company.domain },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[var(--pp-muted)] text-xs mb-1">{label}</p>
              <p className="font-mono text-[var(--pp-ink)]">{value || <span className="text-[var(--pp-muted)] italic">Non renseigné</span>}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Feature Flags</h2>
        <p className="text-xs text-[var(--pp-muted)] mb-4">
          Gérez les fonctionnalités expérimentales pour ce compte
        </p>
        <div className="space-y-2">
          {[
            { key: 'presences', label: 'Présences', desc: 'Débloque la vue des présences en temps réel (plans FREE et SOLO)' },
            { key: 'early_access_api', label: 'early_access_api', desc: 'Accès anticipé à l\'API' },
            { key: 'extended_export', label: 'extended_export', desc: 'Exports étendus' },
            { key: 'custom_reports', label: 'custom_reports', desc: 'Rapports personnalisés' },
          ].map(({ key, label, desc }) => (
            <label
              key={key}
              className="flex items-start gap-3 p-3 border border-[var(--pp-line)] rounded-lg cursor-pointer hover:bg-[var(--pp-bg2)]"
            >
              <input
                type="checkbox"
                checked={flags.find((f) => f.flag === key)?.enabled || false}
                onChange={(e) => handleFeatureFlagToggle(key, e.target.checked)}
                className="rounded mt-0.5"
              />
              <div>
                <p className="text-sm font-mono font-medium">{label}</p>
                <p className="text-xs text-[var(--pp-muted)]">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}
