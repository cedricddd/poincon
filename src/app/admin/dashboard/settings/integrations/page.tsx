'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { showToast } from '@/hooks/useToast'

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
  'clockrecord.created', 'rtt.approved',
]

const EVENT_LABELS: Record<string, string> = {
  'shift.created': 'Shift créé', 'shift.updated': 'Shift modifié', 'shift.deleted': 'Shift supprimé',
  'timeoff.created': 'Congé soumis', 'timeoff.approved': 'Congé approuvé', 'timeoff.rejected': 'Congé refusé',
  'employee.created': 'Employé créé', 'employee.updated': 'Employé modifié',
  'clockrecord.created': 'Pointage enregistré', 'rtt.approved': 'RTT approuvé',
}

type Tab = 'addons' | 'apikeys' | 'webhooks'

export default function IntegrationsPage() {
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
    const [addonsRes, keysRes, whRes] = await Promise.allSettled([
      fetch('/api/admin/addons'),
      fetch('/api/admin/api-keys'),
      fetch('/api/admin/webhooks'),
    ])
    if (addonsRes.status === 'fulfilled' && addonsRes.value.ok) {
      const d = await addonsRes.value.json()
      setAddons(d.addons ?? [])
      setPlan(d.plan ?? '')
    }
    if (keysRes.status === 'fulfilled' && keysRes.value.ok) {
      setApiKeys((await keysRes.value.json()).keys ?? [])
    }
    if (whRes.status === 'fulfilled' && whRes.value.ok) {
      setWebhooks((await whRes.value.json()).endpoints ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const hasApiAddon = addons.find(a => a.flag === 'addon_api_access')?.enabled ?? false
  const hasWHAddon = addons.find(a => a.flag === 'addon_webhooks')?.enabled ?? false

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
      showToast('Clé API créée', 'success')
    } else {
      showToast(data.error ?? 'Erreur', 'error')
    }
    setCreatingKey(false)
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Supprimer cette clé API ? Les intégrations qui l\'utilisent cesseront de fonctionner.')) return
    const res = await fetch(`/api/admin/api-keys?id=${id}`, { method: 'DELETE' })
    if (res.ok) { fetchAll(); showToast('Clé supprimée', 'success') }
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
      showToast('Webhook créé', 'success')
    } else {
      showToast(data.error ?? 'Erreur', 'error')
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
    if (!confirm('Supprimer ce webhook ?')) return
    await fetch(`/api/admin/webhooks?id=${id}`, { method: 'DELETE' })
    fetchAll()
    showToast('Webhook supprimé', 'success')
  }

  if (loading) return <div className="p-8 text-center text-[var(--pp-muted)]">Chargement...</div>

  const isEnterprise = plan === 'ENTERPRISE'
  const isTeam = plan === 'TEAM'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Intégrations & Add-ons</h1>
        <p className="text-sm text-[var(--pp-muted)] mt-1">
          Options payantes, clés API et webhooks pour connecter Pointon à vos outils.
          {isEnterprise && <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Enterprise — tout inclus</span>}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--pp-line)]">
        {(['addons', 'apikeys', 'webhooks'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-[var(--pp-info)] text-[var(--pp-info)]' : 'border-transparent text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'}`}
          >
            {t === 'addons' ? 'Options' : t === 'apikeys' ? 'Clés API' : 'Webhooks'}
          </button>
        ))}
      </div>

      {/* ─── ADDONS TAB ─── */}
      {tab === 'addons' && (
        <div className="space-y-4">
          {!isTeam && !isEnterprise && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Les options sont disponibles à partir du plan <strong>TEAM</strong>. Mettez à niveau pour y accéder.
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
                      {isEnterprise ? 'Inclus' : 'Actif'}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Inactif</span>
                  )}
                </div>
                {!isEnterprise && (
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm font-semibold text-[var(--pp-ink)]">{addon.price}€ / mois</span>
                    {!addon.enabled && addon.availableForPlan && (
                      <button
                        className="text-xs px-3 py-1.5 bg-[var(--pp-info)] text-white rounded-lg font-medium hover:opacity-90"
                        onClick={() => showToast('Redirection Stripe en cours...', 'success')}
                      >
                        Activer
                      </button>
                    )}
                    {addon.enabled && !isEnterprise && (
                      <button className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                        Désactiver
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── API KEYS TAB ─── */}
      {tab === 'apikeys' && (
        <div className="space-y-5">
          {!hasApiAddon && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              L&apos;add-on <strong>Accès API</strong> est requis pour générer des clés API.
              {isEnterprise ? ' Contactez le support.' : ' Activez-le dans l\'onglet Options.'}
            </div>
          )}

          {createdKey && (
            <div className="bg-green-50 border border-green-300 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">Clé API créée — copiez-la maintenant, elle ne sera plus affichée :</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 font-mono break-all">{createdKey}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdKey); showToast('Copié !', 'success') }}
                  className="shrink-0 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Copier
                </button>
              </div>
              <button onClick={() => setCreatedKey(null)} className="mt-2 text-xs text-green-700 underline">J&apos;ai copié ma clé</button>
            </div>
          )}

          {hasApiAddon && (
            <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--pp-ink)]">Nouvelle clé API</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="Nom de la clé (ex: Intégration RH)"
                  className="flex-1 border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
                <input
                  type="date"
                  value={newKeyExpiry}
                  onChange={e => setNewKeyExpiry(e.target.value)}
                  placeholder="Expiration (optionnel)"
                  className="border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm w-full sm:w-44"
                />
                <button
                  onClick={createKey}
                  disabled={creatingKey || !newKeyName.trim()}
                  className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
                >
                  Générer
                </button>
              </div>
              <p className="text-xs text-[var(--pp-muted)]">
                Utilisez l&apos;en-tête <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;votre-clé&gt;</code> dans vos requêtes API.
              </p>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-[var(--pp-muted)] text-sm">Aucune clé API créée.</div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map(key => (
                <div key={key.id} className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-[var(--pp-ink)]">{key.name}</span>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-[var(--pp-muted)] font-mono">{key.keyPrefix}••••••••</span>
                      {key.lastUsedAt && <span className="text-xs text-[var(--pp-muted)]">Dernière utilisation : {new Date(key.lastUsedAt).toLocaleDateString('fr-BE')}</span>}
                      {key.expiresAt && <span className="text-xs text-orange-500">Expire : {new Date(key.expiresAt).toLocaleDateString('fr-BE')}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteKey(key.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 shrink-0">
                    Révoquer
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
              L&apos;add-on <strong>Webhooks sortants</strong> est requis.
              {!isEnterprise && ' Activez-le dans l\'onglet Options.'}
            </div>
          )}

          {createdWebhookSecret && (
            <div className="bg-green-50 border border-green-300 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">Secret du webhook — copiez-le maintenant :</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 font-mono break-all">{createdWebhookSecret}</code>
                <button onClick={() => { navigator.clipboard.writeText(createdWebhookSecret!); showToast('Copié !', 'success') }} className="shrink-0 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg">Copier</button>
              </div>
              <button onClick={() => setCreatedWebhookSecret(null)} className="mt-2 text-xs text-green-700 underline">J&apos;ai noté mon secret</button>
            </div>
          )}

          {hasWHAddon && !showWHForm && (
            <div className="flex justify-end">
              <button onClick={() => setShowWHForm(true)} className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90">
                + Nouveau webhook
              </button>
            </div>
          )}

          {showWHForm && (
            <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--pp-ink)]">Nouveau webhook</h2>
              <div className="space-y-3">
                <input value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder="https://votre-serveur.com/webhook" className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
                <input value={whDesc} onChange={e => setWhDesc(e.target.value)} placeholder="Description (optionnel)" className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm" />
                <div>
                  <label className="text-xs font-medium text-[var(--pp-muted)] block mb-2">Événements (vide = tous)</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_EVENTS.map(ev => (
                      <button
                        key={ev}
                        type="button"
                        onClick={() => setWhEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])}
                        className={`text-xs px-2.5 py-1 rounded font-medium border transition-colors ${whEvents.includes(ev) ? 'bg-[var(--pp-info)] text-white border-[var(--pp-info)]' : 'border-[var(--pp-line)] text-[var(--pp-muted)] hover:border-[var(--pp-info)]'}`}
                      >
                        {EVENT_LABELS[ev] ?? ev}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowWHForm(false)} className="px-4 py-2 text-sm border border-[var(--pp-line)] rounded-lg hover:bg-gray-50">Annuler</button>
                <button onClick={createWebhook} disabled={savingWH || !whUrl.trim()} className="px-4 py-2 text-sm bg-[var(--pp-info)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
                  {savingWH ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          )}

          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-[var(--pp-muted)] text-sm">Aucun webhook configuré.</div>
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
                            <span className="text-xs px-1.5 py-0.5 bg-[var(--pp-info)]/10 text-[var(--pp-info)] rounded">Tous les événements</span>
                          ) : events.slice(0, 5).map(ev => (
                            <span key={ev} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{EVENT_LABELS[ev] ?? ev}</span>
                          ))}
                          {events.length > 5 && <span className="text-xs text-[var(--pp-muted)]">+{events.length - 5}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-3">
                        <button onClick={() => toggleWebhook(wh.id, !wh.enabled)} className="text-xs px-2.5 py-1.5 border border-[var(--pp-line)] rounded-lg hover:bg-gray-50">
                          {wh.enabled ? 'Désactiver' : 'Activer'}
                        </button>
                        <button onClick={() => deleteWebhook(wh.id)} className="text-xs px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                          Supprimer
                        </button>
                      </div>
                    </div>
                    {lastDelivery && (
                      <div className={`px-5 py-2 text-xs border-t border-[var(--pp-line)] ${lastDelivery.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        Dernière livraison : {EVENT_LABELS[lastDelivery.event] ?? lastDelivery.event} — {lastDelivery.statusCode ?? '?'} — {new Date(lastDelivery.attemptedAt).toLocaleString('fr-BE')}
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
