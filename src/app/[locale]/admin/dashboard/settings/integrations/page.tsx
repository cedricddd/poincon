'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { showToast } from '@/hooks/useToast'
import { downloadCompanyDataPdf } from '@/lib/personalDataPdf'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

interface Addon {
  flag: string
  name: string
  description: string
  price: number
  enabled: boolean
  availableForPlan: boolean
}

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface WebhookDeliverySummary {
  event: string
  success: boolean
  statusCode: number | null
  attemptedAt: string
}

interface WebhookEndpoint {
  id: string
  url: string
  description: string | null
  events: string
  enabled: boolean
  createdAt: string
  deliveries: WebhookDeliverySummary[]
}

const ALL_EVENTS = [
  'shift.created', 'shift.updated', 'shift.deleted',
  'timeoff.created', 'timeoff.approved', 'timeoff.rejected',
  'employee.created', 'employee.updated',
  'clockrecord.created', 'clockrecord.departed', 'rtt.approved',
]

const EVENT_KEY: Record<string, string> = {
  'shift.created': 'evShiftCreated', 'shift.updated': 'evShiftUpdated', 'shift.deleted': 'evShiftDeleted',
  'timeoff.created': 'evTimeoffCreated', 'timeoff.approved': 'evTimeoffApproved', 'timeoff.rejected': 'evTimeoffRejected',
  'employee.created': 'evEmployeeCreated', 'employee.updated': 'evEmployeeUpdated',
  'clockrecord.created': 'evClockCreated', 'clockrecord.departed': 'evClockDeparted', 'rtt.approved': 'evRttApproved',
}

type Tab = 'addons' | 'apikeys' | 'webhooks'

export default function IntegrationsPage() {
  const t = useTranslations('integrations')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const eventLabel = (ev: string) => (EVENT_KEY[ev] ? t(EVENT_KEY[ev]) : ev)

  const [tab, setTab] = useState<Tab>('addons')
  const [plan, setPlan] = useState<string>('')
  const [addons, setAddons] = useState<Addon[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)

  // API key form
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyExpiry, setNewKeyExpiry] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [creatingKey, setCreatingKey] = useState(false)

  // Webhook form
  const [showWHForm, setShowWHForm] = useState(false)
  const [whUrl, setWhUrl] = useState('')
  const [whDesc, setWhDesc] = useState('')
  const [whEvents, setWhEvents] = useState<string[]>([])
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null)
  const [savingWH, setSavingWH] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    const addonsRes = await fetch('/api/admin/addons')
    if (addonsRes.ok) {
      const d = await addonsRes.json()
      const fetchedAddons: Addon[] = d.addons ?? []
      setAddons(fetchedAddons)
      setPlan(d.plan ?? '')

      const apiEnabled = fetchedAddons.find(a => a.flag === 'addon_api_access')?.enabled ?? false
      const whEnabled = fetchedAddons.find(a => a.flag === 'addon_webhooks')?.enabled ?? false

      const [keysRes, whRes] = await Promise.allSettled([
        apiEnabled ? fetch('/api/admin/api-keys') : Promise.resolve(null),
        whEnabled ? fetch('/api/admin/webhooks') : Promise.resolve(null),
      ])
      if (keysRes.status === 'fulfilled' && keysRes.value?.ok) {
        setApiKeys((await keysRes.value.json()).keys ?? [])
      }
      if (whRes.status === 'fulfilled' && whRes.value?.ok) {
        setWebhooks((await whRes.value.json()).endpoints ?? [])
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const hasApiAddon = addons.find(a => a.flag === 'addon_api_access')?.enabled ?? false
  const hasWHAddon = addons.find(a => a.flag === 'addon_webhooks')?.enabled ?? false
  const hasRgpdAddon = addons.find(a => a.flag === 'addon_rgpd_export')?.enabled ?? false

  useEffect(() => {
    if (hasRgpdAddon && retentionYears === null) fetchRetention()
  }, [hasRgpdAddon])

  // --- API Keys ---
  const createKey = async () => {
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    const res = await fetch('/api/admin/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName.trim(), expiresAt: newKeyExpiry || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setCreatedKey(data.key.rawKey)
      setNewKeyName('')
      setNewKeyExpiry('')
      fetchAll()
      showToast(t('keyCreated'), 'success')
    } else {
      showToast(data.error ?? t('error'), 'error')
    }
    setCreatingKey(false)
  }

  const deleteKey = async (id: string) => {
    if (!confirm(t('confirmDeleteKey'))) return
    const res = await fetch(`/api/admin/api-keys?id=${id}`, { method: 'DELETE' })
    if (res.ok) { fetchAll(); showToast(t('keyDeleted'), 'success') }
  }

  // --- Addons ---
  const [togglingAddon, setTogglingAddon] = useState<string | null>(null)
  const [retentionYears, setRetentionYears] = useState<number | null>(null)
  const [savingRetention, setSavingRetention] = useState(false)
  const [exportingRgpd, setExportingRgpd] = useState(false)

  const fetchRetention = async () => {
    const res = await fetch('/api/admin/company/retention')
    if (res.ok) {
      const d = await res.json()
      setRetentionYears(d.auditLogRetentionYears ?? 3)
    }
  }

  const saveRetention = async (years: number) => {
    setSavingRetention(true)
    const res = await fetch('/api/admin/company/retention', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ years }),
    })
    if (res.ok) {
      setRetentionYears(years)
      showToast(t('retentionSaved'), 'success')
    } else {
      const data = await res.json()
      showToast(data.error ?? t('error'), 'error')
    }
    setSavingRetention(false)
  }

  const exportCompanyData = async (format: 'pdf' | 'json') => {
    setExportingRgpd(true)
    try {
      const res = await fetch('/api/admin/company/export')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.error ?? t('error'), 'error')
        return
      }
      if (format === 'json') {
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `pointon-export-entreprise-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
      } else {
        const data = await res.json()
        await downloadCompanyDataPdf(data)
      }
    } finally {
      setExportingRgpd(false)
    }
  }
  const toggleAddon = async (flag: string, enable: boolean) => {
    if (!enable && !confirm(t('confirmDeactivateAddon'))) return
    setTogglingAddon(flag)
    const res = await fetch('/api/admin/addons/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag, enable }),
    })
    const data = await res.json()
    if (res.ok && data.checkoutUrl) {
      window.location.href = data.checkoutUrl
      return
    }
    if (res.ok) {
      fetchAll()
      showToast(enable ? t('addonActivated') : t('addonDeactivated'), 'success')
    } else {
      showToast(data.error ?? t('error'), 'error')
    }
    setTogglingAddon(null)
  }

  // --- Webhooks ---
  const createWebhook = async () => {
    if (!whUrl.trim()) return
    setSavingWH(true)
    const res = await fetch('/api/admin/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: whUrl.trim(), events: whEvents, description: whDesc }),
    })
    const data = await res.json()
    if (res.ok) {
      setCreatedWebhookSecret(data.endpoint.secret)
      setShowWHForm(false)
      setWhUrl(''); setWhDesc(''); setWhEvents([])
      fetchAll()
      showToast(t('whCreated'), 'success')
    } else {
      showToast(data.error ?? t('error'), 'error')
    }
    setSavingWH(false)
  }

  const toggleWebhook = async (id: string, enabled: boolean) => {
    await fetch('/api/admin/webhooks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    })
    fetchAll()
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm(t('confirmDeleteWebhook'))) return
    await fetch(`/api/admin/webhooks?id=${id}`, { method: 'DELETE' })
    fetchAll()
    showToast(t('whDeleted'), 'success')
  }

  if (loading) return <div className="p-8 text-center text-[var(--pp-muted)]">{t('loading')}</div>

  const isEnterprise = plan === 'ENTERPRISE'
  const isTeam = plan === 'TEAM'

  const tabLabel = (tk: Tab) => tk === 'addons' ? t('tabOptions') : tk === 'apikeys' ? t('tabApiKeys') : t('tabWebhooks')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
        <p className="text-sm text-[var(--pp-muted)] mt-1">
          {t('subtitle')}
          {isEnterprise && <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">{t('enterpriseAllIncluded')}</span>}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--pp-line)]">
        {(['addons', 'apikeys', 'webhooks'] as Tab[]).map(tk => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === tk ? 'border-[var(--pp-info)] text-[var(--pp-info)]' : 'border-transparent text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'}`}
          >
            {tabLabel(tk)}
          </button>
        ))}
      </div>

      {/* ─── ADDONS TAB ─── */}
      {tab === 'addons' && (
        <div className="space-y-4">
          {!isTeam && !isEnterprise && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              {t.rich('optionsTeamRequired', { b: (c) => <strong>{c}</strong> })}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addons.map(addon => (
              <div
                key={addon.flag}
                className={`bg-[var(--pp-bg2)] border rounded-xl p-5 flex flex-col gap-3 ${addon.enabled ? 'border-[var(--pp-info)]/40' : 'border-[var(--pp-line)]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-[var(--pp-ink)] text-sm">{addon.name}</span>
                    <p className="text-xs text-[var(--pp-muted)] mt-0.5">{addon.description}</p>
                  </div>
                  {addon.enabled ? (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      {isEnterprise ? t('included') : t('active')}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{t('inactive')}</span>
                  )}
                </div>
                {!isEnterprise && (
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm font-semibold text-[var(--pp-ink)]">{t('addonPrice', { price: addon.price })}</span>
                    {!addon.enabled && addon.availableForPlan && (
                      <button
                        className="text-xs px-3 py-1.5 bg-[var(--pp-info)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                        disabled={togglingAddon === addon.flag}
                        onClick={() => toggleAddon(addon.flag, true)}
                      >
                        {togglingAddon === addon.flag ? t('loading') : t('activate')}
                      </button>
                    )}
                    {addon.enabled && !isEnterprise && (
                      <button
                        className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        disabled={togglingAddon === addon.flag}
                        onClick={() => toggleAddon(addon.flag, false)}
                      >
                        {togglingAddon === addon.flag ? t('loading') : t('deactivate')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasRgpdAddon && (
            <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-[var(--pp-ink)] text-sm">{t('rgpdSectionTitle')}</h3>
              <div className="flex items-center gap-3">
                <button
                  className="text-xs px-3 py-1.5 bg-[var(--pp-info)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  disabled={exportingRgpd}
                  onClick={() => exportCompanyData('pdf')}
                >
                  {exportingRgpd ? t('loading') : t('rgpdExportBtnPdf')}
                </button>
                <button
                  className="text-xs px-3 py-1.5 border border-[var(--pp-line)] text-[var(--pp-ink)] rounded-lg font-medium hover:bg-[var(--pp-bg)] disabled:opacity-50"
                  disabled={exportingRgpd}
                  onClick={() => exportCompanyData('json')}
                >
                  {exportingRgpd ? t('loading') : t('rgpdExportBtnJson')}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-[var(--pp-muted)]">{t('rgpdRetentionLabel')}</label>
                <select
                  value={retentionYears ?? 3}
                  disabled={savingRetention}
                  onChange={e => saveRetention(Number(e.target.value))}
                  className="px-2 py-1 border border-[var(--pp-line)] rounded-lg text-xs bg-[var(--pp-bg)]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => (
                    <option key={y} value={y}>{y} {t('years')}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── API KEYS TAB ─── */}
      {tab === 'apikeys' && (
        <div className="space-y-5">
          {!hasApiAddon && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              {t.rich('apiAddonRequired', { b: (c) => <strong>{c}</strong> })}
              {isEnterprise ? t('contactSupport') : t('activateInOptions')}
            </div>
          )}

          {createdKey && (
            <div className="bg-green-50 border border-green-300 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">{t('keyCreatedCopy')}</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 font-mono break-all">{createdKey}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdKey); showToast(t('copied'), 'success') }}
                  className="shrink-0 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {t('copy')}
                </button>
              </div>
              <button onClick={() => setCreatedKey(null)} className="mt-2 text-xs text-green-700 underline">{t('copiedMyKey')}</button>
            </div>
          )}

          {hasApiAddon && (
            <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('newApiKey')}</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder={t('keyNamePlaceholder')}
                  className="flex-1 border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
                <input
                  type="date"
                  value={newKeyExpiry}
                  onChange={e => setNewKeyExpiry(e.target.value)}
                  placeholder={t('expiryPlaceholder')}
                  className="border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm w-full sm:w-44"
                />
                <button
                  onClick={createKey}
                  disabled={creatingKey || !newKeyName.trim()}
                  className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
                >
                  {t('generate')}
                </button>
              </div>
              <p className="text-xs text-[var(--pp-muted)]">
                {t.rich('apiHeaderHint', {
                  header: 'Authorization: Bearer <votre-clé>',
                  code: (c) => <code className="bg-gray-100 px-1 rounded">{c}</code>,
                })}
              </p>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-[var(--pp-muted)] text-sm">{t('noApiKeys')}</div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map(key => (
                <div key={key.id} className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-[var(--pp-ink)]">{key.name}</span>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-[var(--pp-muted)] font-mono">{key.keyPrefix}••••••••</span>
                      {key.lastUsedAt && <span className="text-xs text-[var(--pp-muted)]">{t('lastUsed', { date: new Date(key.lastUsedAt).toLocaleDateString(bcp) })}</span>}
                      {key.expiresAt && <span className="text-xs text-orange-500">{t('expiresOn', { date: new Date(key.expiresAt).toLocaleDateString(bcp) })}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteKey(key.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 shrink-0">
                    {t('revoke')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── WEBHOOKS TAB ─── */}
      {tab === 'webhooks' && (
        <div className="space-y-5">
          {!hasWHAddon && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              {t.rich('whAddonRequired', { b: (c) => <strong>{c}</strong> })}
              {!isEnterprise && t('activateInOptions')}
            </div>
          )}

          {createdWebhookSecret && (
            <div className="bg-green-50 border border-green-300 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">{t('whSecretCopy')}</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 font-mono break-all">{createdWebhookSecret}</code>
                <button onClick={() => { navigator.clipboard.writeText(createdWebhookSecret!); showToast(t('copied'), 'success') }} className="shrink-0 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg">{t('copy')}</button>
              </div>
              <button onClick={() => setCreatedWebhookSecret(null)} className="mt-2 text-xs text-green-700 underline">{t('notedSecret')}</button>
            </div>
          )}

          {hasWHAddon && !showWHForm && (
            <div className="flex justify-end">
              <button onClick={() => setShowWHForm(true)} className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90">
                {t('newWebhookBtn')}
              </button>
            </div>
          )}

          {showWHForm && (
            <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('newWebhook')}</h2>
              <div className="space-y-3">
                <input value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder={t('whUrlPlaceholder')} className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
                <input value={whDesc} onChange={e => setWhDesc(e.target.value)} placeholder={t('whDescPlaceholder')} className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm" />
                <div>
                  <label className="text-xs font-medium text-[var(--pp-muted)] block mb-2">{t('eventsLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_EVENTS.map(ev => (
                      <button
                        key={ev}
                        type="button"
                        onClick={() => setWhEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])}
                        className={`text-xs px-2.5 py-1 rounded font-medium border transition-colors ${whEvents.includes(ev) ? 'bg-[var(--pp-info)] text-white border-[var(--pp-info)]' : 'border-[var(--pp-line)] text-[var(--pp-muted)] hover:border-[var(--pp-info)]'}`}
                      >
                        {eventLabel(ev)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowWHForm(false)} className="px-4 py-2 text-sm border border-[var(--pp-line)] rounded-lg hover:bg-gray-50">{t('cancel')}</button>
                <button onClick={createWebhook} disabled={savingWH || !whUrl.trim()} className="px-4 py-2 text-sm bg-[var(--pp-info)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
                  {savingWH ? t('creating') : t('create')}
                </button>
              </div>
            </div>
          )}

          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-[var(--pp-muted)] text-sm">{t('noWebhooks')}</div>
          ) : (
            <div className="space-y-3">
              {webhooks.map(wh => {
                const events: string[] = JSON.parse(wh.events || '[]')
                const lastDelivery = wh.deliveries[0]
                return (
                  <div key={wh.id} className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${wh.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-sm font-medium text-[var(--pp-ink)] truncate">{wh.url}</span>
                        </div>
                        {wh.description && <p className="text-xs text-[var(--pp-muted)] mt-0.5 ml-4">{wh.description}</p>}
                        <div className="flex flex-wrap gap-1 mt-1.5 ml-4">
                          {events.length === 0 ? (
                            <span className="text-xs px-1.5 py-0.5 bg-[var(--pp-info)]/10 text-[var(--pp-info)] rounded">{t('allEvents')}</span>
                          ) : events.slice(0, 5).map(ev => (
                            <span key={ev} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{eventLabel(ev)}</span>
                          ))}
                          {events.length > 5 && <span className="text-xs text-[var(--pp-muted)]">+{events.length - 5}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-3">
                        <button onClick={() => toggleWebhook(wh.id, !wh.enabled)} className="text-xs px-2.5 py-1.5 border border-[var(--pp-line)] rounded-lg hover:bg-gray-50">
                          {wh.enabled ? t('deactivate') : t('activate')}
                        </button>
                        <button onClick={() => deleteWebhook(wh.id)} className="text-xs px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                          {t('delete')}
                        </button>
                      </div>
                    </div>
                    {lastDelivery && (
                      <div className={`px-5 py-2 text-xs border-t border-[var(--pp-line)] ${lastDelivery.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {t('lastDelivery', { event: eventLabel(lastDelivery.event), code: lastDelivery.statusCode ?? '?', date: new Date(lastDelivery.attemptedAt).toLocaleString(bcp) })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
