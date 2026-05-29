'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import Image from 'next/image'

interface CompanySettings {
  id: string
  name: string
  domain: string | null
  address: string | null
  phone: string | null
  vatNumber: string | null
  contactEmail: string | null
  logoUrl: string | null
  plan: { name: string } | null
  stripeSubscriptionId: string | null
  stripeSubscriptionBillingCycle: string | null
  stripeCancelAtPeriodEnd: boolean
  planExpiresAt: string | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [form, setForm] = useState({ name: '', domain: '', address: '', phone: '', vatNumber: '', contactEmail: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/company/settings')
      .then(r => {
        if (!r.ok) throw new Error(`Erreur serveur (${r.status})`)
        return r.json()
      })
      .then(data => {
        setSettings(data)
        setForm({
          name: data.name ?? '',
          domain: data.domain ?? '',
          address: data.address ?? '',
          phone: data.phone ?? '',
          vatNumber: data.vatNumber ?? '',
          contactEmail: data.contactEmail ?? '',
        })
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/company/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde')
      const data = await res.json()
      setSettings(data)
      setSuccess('Paramètres sauvegardés.')
    } catch {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/admin/company/logo', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erreur upload')
      }
      const { logoUrl } = await res.json()
      setSettings(prev => prev ? { ...prev, logoUrl } : prev)
      setSuccess('Logo mis à jour.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Résilier votre abonnement ?\n\nVotre accès sera maintenu jusqu\'à la fin de la période en cours. Aucun remboursement ne sera effectué.')) return
    setCancelLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      if (!res.ok) { setError((await res.json()).error); return }
      setSettings(prev => prev ? { ...prev, stripeCancelAtPeriodEnd: true } : prev)
      setSuccess('Résiliation programmée. Votre accès reste actif jusqu\'à la fin de la période.')
    } catch {
      setError('Erreur lors de la résiliation.')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleReactivate = async () => {
    setCancelLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/reactivate', { method: 'POST' })
      if (!res.ok) { setError((await res.json()).error); return }
      setSettings(prev => prev ? { ...prev, stripeCancelAtPeriodEnd: false } : prev)
      setSuccess('Abonnement réactivé.')
    } catch {
      setError('Erreur lors de la réactivation.')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleLogoDelete = async () => {
    if (!confirm('Supprimer le logo ?')) return
    setUploadingLogo(true)
    try {
      await fetch('/api/admin/company/logo', { method: 'DELETE' })
      setSettings(prev => prev ? { ...prev, logoUrl: null } : prev)
      setSuccess('Logo supprimé.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Les nouveaux mots de passe ne correspondent pas')
      return
    }
    setPwSaving(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPwError(data.error || 'Erreur lors de la mise à jour')
      } else {
        setPwSuccess('Mot de passe mis à jour avec succès')
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch {
      setPwError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-[var(--pp-muted)]">Chargement...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Paramètres de la société</h1>

      {/* Logo */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Logo</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl border border-[var(--pp-line)] bg-[var(--pp-surface)] flex items-center justify-center overflow-hidden">
            {settings?.logoUrl ? (
              <Image src={settings.logoUrl} alt="Logo" width={96} height={96} className="object-contain w-full h-full" />
            ) : (
              <span className="text-3xl text-[var(--pp-muted)]">🏢</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? 'Upload...' : 'Choisir un logo'}
            </Button>
            {settings?.logoUrl && (
              <Button size="sm" variant="outline" onClick={handleLogoDelete} disabled={uploadingLogo}>
                Supprimer
              </Button>
            )}
            <p className="text-xs text-[var(--pp-muted)]">PNG, JPG, WebP ou SVG — max 2 Mo</p>
          </div>
        </div>
      </Card>

      {/* Abonnement */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Abonnement</h2>
        {(() => {
          const planName = settings?.plan?.name ?? 'FREE'
          const isPaid = !!settings?.stripeSubscriptionId
          const isCancelling = settings?.stripeCancelAtPeriodEnd ?? false
          const cycle = settings?.stripeSubscriptionBillingCycle
          const expiresAt = settings?.planExpiresAt ? new Date(settings.planExpiresAt) : null

          const planColors: Record<string, string> = {
            FREE: 'bg-[var(--pp-line)] text-[var(--pp-muted)]',
            SOLO: 'bg-blue-100 text-blue-700',
            TEAM: 'bg-[#7c3aed]/10 text-[#7c3aed]',
            ENTERPRISE: 'bg-amber-100 text-amber-700',
          }
          const planColor = planColors[planName] ?? planColors.FREE

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${planColor}`}>{planName}</span>
                {isPaid && cycle && (
                  <span className="text-sm text-[var(--pp-muted)]">{cycle === 'monthly' ? 'Mensuel' : 'Annuel'}</span>
                )}
                {isCancelling && expiresAt && (
                  <span className="text-sm text-[var(--pp-neg)] font-medium">
                    Résiliation le {expiresAt.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
                {!isCancelling && expiresAt && (
                  <span className="text-sm text-[var(--pp-muted)]">
                    Expire le {expiresAt.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>

              {isCancelling && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  Votre abonnement sera résilié à la fin de la période en cours. Aucun remboursement ne sera effectué.
                </div>
              )}

              <div className="flex gap-3 flex-wrap pt-1">
                {isPaid && (
                  <a href="/api/stripe/portal" className="inline-flex items-center px-4 py-2 border border-[var(--pp-line)] rounded-lg text-sm font-medium text-[var(--pp-ink)] hover:bg-[var(--pp-bg)] transition-colors">
                    Gérer la facturation →
                  </a>
                )}
                {isPaid && !isCancelling && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    className="px-4 py-2 text-sm font-medium text-[var(--pp-neg)] border border-[var(--pp-neg)]/30 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {cancelLoading ? 'Traitement…' : 'Résilier l\'abonnement'}
                  </button>
                )}
                {isPaid && isCancelling && (
                  <Button size="sm" onClick={handleReactivate} disabled={cancelLoading}>
                    {cancelLoading ? 'Traitement…' : 'Réactiver l\'abonnement'}
                  </Button>
                )}
                {!isPaid && planName === 'FREE' && (
                  <Link href="/#pricing" className="inline-flex items-center px-4 py-2 bg-[#7c3aed] text-white rounded-lg text-sm font-medium hover:bg-[#6d28d9] transition-colors">
                    Passer à un plan payant →
                  </Link>
                )}
                {!isPaid && planName !== 'FREE' && (
                  <p className="text-sm text-[var(--pp-muted)] italic">Plan activé manuellement — contactez le support pour la gestion de la facturation.</p>
                )}
              </div>
            </div>
          )
        })()}
      </Card>

      {/* Infos société */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Informations</h2>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Nom de la société</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Domaine email</label>
            <input
              value={form.domain}
              onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              placeholder="ced-it.be"
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
            <p className="text-xs text-[var(--pp-muted)] mt-1">Domaine email de votre entreprise (ex : ced-it.be)</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Téléphone</label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Numéro TVA</label>
              <input
                value={form.vatNumber}
                onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))}
                placeholder="BE0123456789"
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Adresse</label>
            <input
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Email de contact</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <Button type="submit" disabled={saving} size="md">
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </form>
      </Card>

      {/* Mot de passe */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Changer le mot de passe</h2>

        {pwError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{pwError}</div>
        )}
        {pwSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{pwSuccess}</div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
            <p className="text-xs text-[var(--pp-muted)] mt-1">Minimum 8 caractères</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <Button type="submit" disabled={pwSaving} size="md">
            {pwSaving ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
