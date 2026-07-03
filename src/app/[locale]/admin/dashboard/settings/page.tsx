'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations, useLocale } from 'next-intl'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import Image from 'next/image'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

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
  seatUsage: {
    activeMembers: number
    includedSeats: number
    extraSeats: number
    pricePerSeatCents: number
    extraCostCents: number
    cycle: string
  } | null
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const { data: session } = useSession()
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

  const [tfaDisableCode, setTfaDisableCode] = useState('')
  const [tfaDisabling, setTfaDisabling] = useState(false)
  const [tfaDisableSuccess, setTfaDisableSuccess] = useState('')
  const [tfaDisableError, setTfaDisableError] = useState('')

  const [presenceSettings, setPresenceSettings] = useState<{
    hasAccess: boolean; planAllows: boolean; flagOverride: boolean
    presenceForManagers: boolean; presenceForEmployees: boolean; mealBreakEnabled: boolean
  } | null>(null)
  const [presenceSaving, setPresenceSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/company/settings').then(r => { if (!r.ok) throw new Error(t('serverError', { status: r.status })); return r.json() }),
      fetch('/api/admin/presence/settings').then(r => r.ok ? r.json() : null),
    ])
      .then(([companyData, presenceData]) => {
        setSettings(companyData)
        setForm({
          name: companyData.name ?? '',
          domain: companyData.domain ?? '',
          address: companyData.address ?? '',
          phone: companyData.phone ?? '',
          vatNumber: companyData.vatNumber ?? '',
          contactEmail: companyData.contactEmail ?? '',
        })
        if (presenceData) setPresenceSettings(presenceData)
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
      if (!res.ok) throw new Error(t('saveError'))
      const data = await res.json()
      setSettings(data)
      setSuccess(t('saved'))
    } catch {
      setError(t('saveError'))
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
        throw new Error(data.error ?? t('uploadError'))
      }
      const { logoUrl } = await res.json()
      setSettings(prev => prev ? { ...prev, logoUrl } : prev)
      setSuccess(t('logoUpdated'))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm(t('confirmCancel'))) return
    setCancelLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      if (!res.ok) { setError((await res.json()).error); return }
      setSettings(prev => prev ? { ...prev, stripeCancelAtPeriodEnd: true } : prev)
      setSuccess(t('cancelScheduled'))
    } catch {
      setError(t('cancelError'))
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
      setSuccess(t('reactivated'))
    } catch {
      setError(t('reactivateError'))
    } finally {
      setCancelLoading(false)
    }
  }

  const handlePresenceToggle = async (field: 'presenceForManagers' | 'presenceForEmployees' | 'mealBreakEnabled') => {
    if (!presenceSettings) return
    setPresenceSaving(true)
    const newValue = !presenceSettings[field]
    const res = await fetch('/api/admin/presence/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: newValue }),
    })
    if (res.ok) {
      setPresenceSettings(prev => prev ? { ...prev, [field]: newValue } : prev)
    }
    setPresenceSaving(false)
  }

  const handleLogoDelete = async () => {
    if (!confirm(t('confirmDeleteLogo'))) return
    setUploadingLogo(true)
    try {
      await fetch('/api/admin/company/logo', { method: 'DELETE' })
      setSettings(prev => prev ? { ...prev, logoUrl: null } : prev)
      setSuccess(t('logoDeleted'))
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleTfaDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    setTfaDisableError('')
    setTfaDisableSuccess('')
    setTfaDisabling(true)
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: tfaDisableCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTfaDisableError(data.error ?? t('tfaInvalidCode'))
        return
      }
      setTfaDisableSuccess(t('tfaDisabledSuccess'))
      setTfaDisableCode('')
    } catch {
      setTfaDisableError(t('tfaNetworkError'))
    } finally {
      setTfaDisabling(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError(t('pwMismatch'))
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
        setPwError(data.error || t('pwUpdateError'))
      } else {
        setPwSuccess(t('pwUpdated'))
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch {
      setPwError(t('networkError'))
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-[var(--pp-muted)]">{t('loading')}</div>

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('company')}</h1>

      {/* Logo */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">{t('logo')}</h2>
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
              {uploadingLogo ? t('logoUploading') : t('chooseLogo')}
            </Button>
            {settings?.logoUrl && (
              <Button size="sm" variant="outline" onClick={handleLogoDelete} disabled={uploadingLogo}>
                {t('delete')}
              </Button>
            )}
            <p className="text-xs text-[var(--pp-muted)]">{t('logoHint')}</p>
          </div>
        </div>
      </Card>

      {/* Abonnement */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">{t('subscription')}</h2>
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
                  <span className="text-sm text-[var(--pp-muted)]">{cycle === 'monthly' ? t('monthly') : t('yearly')}</span>
                )}
                {isCancelling && expiresAt && (
                  <span className="text-sm text-[var(--pp-neg)] font-medium">
                    {t('cancelOn', { date: expiresAt.toLocaleDateString(bcp, { day: 'numeric', month: 'long', year: 'numeric' }) })}
                  </span>
                )}
                {!isCancelling && expiresAt && (
                  <span className="text-sm text-[var(--pp-muted)]">
                    {t('expiresOn', { date: expiresAt.toLocaleDateString(bcp, { day: 'numeric', month: 'long', year: 'numeric' }) })}
                  </span>
                )}
              </div>

              {settings?.seatUsage && (() => {
                const su = settings.seatUsage
                const euros = (cents: number) => (cents / 100).toLocaleString(bcp, { minimumFractionDigits: 2 })
                const per = su.cycle === 'yearly' ? t('perYear') : t('perMonth')
                return (
                  <div className="p-4 bg-[var(--pp-bg)] border border-[var(--pp-line)] rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--pp-muted)]">{t('activeMembers')}</span>
                      <span className="font-medium text-[var(--pp-ink)]">{su.activeMembers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--pp-muted)]">{t('includedInPlan')}</span>
                      <span className="font-medium text-[var(--pp-ink)]">{su.includedSeats}</span>
                    </div>
                    {su.extraSeats > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--pp-muted)]">{t('extraSeatsLabel')}</span>
                          <span className="font-medium text-[var(--pp-ink)]">
                            {su.extraSeats} × {euros(su.pricePerSeatCents)}&nbsp;€
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-[var(--pp-line)]">
                          <span className="font-medium text-[var(--pp-ink)]">{t('extraCostLabel')}</span>
                          <span className="font-semibold text-[#7c3aed]">+{euros(su.extraCostCents)}&nbsp;€{per} {t('htva')}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--pp-muted)] pt-1">
                        {t('seatsAvailable', { count: su.includedSeats - su.activeMembers })}
                      </p>
                    )}
                  </div>
                )
              })()}

              {isCancelling && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  {t('cancellingNotice')}
                </div>
              )}

              <div className="flex gap-3 flex-wrap pt-1">
                {isPaid && (
                  <a href="/api/stripe/portal" className="inline-flex items-center px-4 py-2 border border-[var(--pp-line)] rounded-lg text-sm font-medium text-[var(--pp-ink)] hover:bg-[var(--pp-bg)] transition-colors">
                    {t('manageBilling')}
                  </a>
                )}
                {isPaid && !isCancelling && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    className="px-4 py-2 text-sm font-medium text-[var(--pp-neg)] border border-[var(--pp-neg)]/30 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {cancelLoading ? t('processing') : t('cancelSubscription')}
                  </button>
                )}
                {isPaid && isCancelling && (
                  <Button size="sm" onClick={handleReactivate} disabled={cancelLoading}>
                    {cancelLoading ? t('processing') : t('reactivateSubscription')}
                  </Button>
                )}
                {!isPaid && planName === 'FREE' && (
                  <a href="/pricing" className="inline-flex items-center px-4 py-2 bg-[#7c3aed] text-white rounded-lg text-sm font-medium hover:bg-[#6d28d9] transition-colors">
                    {t('comparePlans')}
                  </a>
                )}
                {!isPaid && planName !== 'FREE' && (
                  <p className="text-sm text-[var(--pp-muted)] italic">{t('manualPlanNotice')}</p>
                )}
              </div>
            </div>
          )
        })()}
      </Card>

      {/* Infos société */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">{t('info')}</h2>

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
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('companyName')}</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('emailDomain')}</label>
            <input
              value={form.domain}
              onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              placeholder="ced-it.be"
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
            <p className="text-xs text-[var(--pp-muted)] mt-1">{t('emailDomainHint')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('phone')}</label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('vatNumber')}</label>
              <input
                value={form.vatNumber}
                onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))}
                placeholder="BE0123456789"
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('address')}</label>
            <input
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('contactEmail')}</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <Button type="submit" disabled={saving} size="md">
            {saving ? t('saving') : t('save')}
          </Button>
        </form>
      </Card>

      {/* Présences */}
      {presenceSettings !== null && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-1">{t('presence')}</h2>
          <p className="text-xs text-[var(--pp-muted)] mb-4">
            {t('presenceDesc')}
          </p>

          {!presenceSettings.hasAccess ? (
            <div className="p-4 rounded-lg border border-[var(--pp-line)] bg-[var(--pp-bg2)] text-center space-y-2">
              <p className="text-sm font-medium text-[var(--pp-ink)]">{t('featureUnavailable')}</p>
              <p className="text-xs text-[var(--pp-muted)]">
                {t.rich('presenceTeamRequired', { b: (c) => <strong>{c}</strong> })}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {presenceSettings.flagOverride && (
                <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                  {t('manualUnlock')}
                </div>
              )}
              <label className="flex items-center justify-between p-3 border border-[var(--pp-line)] rounded-lg cursor-pointer hover:bg-[var(--pp-bg2)] transition">
                <div>
                  <p className="text-sm font-medium text-[var(--pp-ink)]">{t('visibleManagers')}</p>
                  <p className="text-xs text-[var(--pp-muted)]">{t('visibleManagersDesc')}</p>
                </div>
                <button
                  onClick={() => handlePresenceToggle('presenceForManagers')}
                  disabled={presenceSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    presenceSettings.presenceForManagers ? 'bg-[var(--pp-pos-btn)]' : 'bg-[var(--pp-line)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      presenceSettings.presenceForManagers ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              <label className="flex items-center justify-between p-3 border border-[var(--pp-line)] rounded-lg cursor-pointer hover:bg-[var(--pp-bg2)] transition">
                <div>
                  <p className="text-sm font-medium text-[var(--pp-ink)]">{t('visibleEmployees')}</p>
                  <p className="text-xs text-[var(--pp-muted)]">{t('visibleEmployeesDesc')}</p>
                </div>
                <button
                  onClick={() => handlePresenceToggle('presenceForEmployees')}
                  disabled={presenceSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    presenceSettings.presenceForEmployees ? 'bg-[var(--pp-pos-btn)]' : 'bg-[var(--pp-line)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      presenceSettings.presenceForEmployees ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          )}
        </Card>
      )}

      {/* Pointage */}
      {presenceSettings !== null && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-1">{t('clockingTitle')}</h2>
          <p className="text-xs text-[var(--pp-muted)] mb-4">
            {t('clockingDesc')}
          </p>
          <label className="flex items-center justify-between p-3 border border-[var(--pp-line)] rounded-lg cursor-pointer hover:bg-[var(--pp-bg2)] transition">
            <div>
              <p className="text-sm font-medium text-[var(--pp-ink)]">{t('mealBreak')}</p>
              <p className="text-xs text-[var(--pp-muted)]">
                {t('mealBreakDesc')}
              </p>
            </div>
            <button
              onClick={() => handlePresenceToggle('mealBreakEnabled')}
              disabled={presenceSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 shrink-0 ml-4 ${
                presenceSettings.mealBreakEnabled ? 'bg-[var(--pp-pos-btn)]' : 'bg-[var(--pp-line)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  presenceSettings.mealBreakEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </Card>
      )}

      {/* Mot de passe */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">{t('changePassword')}</h2>

        {pwError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{pwError}</div>
        )}
        {pwSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{pwSuccess}</div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('currentPassword')}</label>
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
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('newPassword')}</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
            <p className="text-xs text-[var(--pp-muted)] mt-1">{t('pwMinHint')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('confirmNewPassword')}</label>
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
            {pwSaving ? t('pwSaving') : t('updatePassword')}
          </Button>
        </form>
      </Card>

      {/* 2FA */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-1">{t('tfaTitle')}</h2>
        <p className="text-sm text-[var(--pp-muted)] mb-4">
          {t.rich('tfaDesc', { b: (c) => <strong>{c}</strong> })}
        </p>

        {session?.user?.twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {t('tfaEnabled')}
            </div>

            {tfaDisableSuccess ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{tfaDisableSuccess}</div>
            ) : (
              <form onSubmit={handleTfaDisable} className="space-y-3">
                <p className="text-sm text-[var(--pp-muted)]">
                  {t('tfaDisableHint')}
                </p>
                {tfaDisableError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{tfaDisableError}</div>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  maxLength={7}
                  value={tfaDisableCode}
                  onChange={e => setTfaDisableCode(e.target.value)}
                  placeholder="123 456"
                  required
                  className="w-48 px-4 py-2 text-center tracking-widest border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-danger,#ef4444)]"
                />
                <div>
                  <button
                    type="submit"
                    disabled={tfaDisabling}
                    className="px-3 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {tfaDisabling ? t('tfaDisabling') : t('tfaDisable')}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              {t('tfaNotConfigured')}
            </div>
            <p className="text-sm text-[var(--pp-muted)]">
              {t('tfaNotConfiguredDesc')}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
