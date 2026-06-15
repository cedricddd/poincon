'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

type Site = { id: string; name: string }
type KioskToken = {
  id: string
  token: string
  label: string | null
  siteId: string | null
  site: Site | null
  createdAt: string
}

export default function KioskPage() {
  const [tokens, setTokens] = useState<KioskToken[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [plan, setPlan] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [siteId, setSiteId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const fetchTokens = () => {
    setLoading(true)
    fetch('/api/admin/kiosk/tokens')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setTokens(d.tokens ?? [])
        setSites(d.sites ?? [])
        setPlan(d.plan ?? '')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTokens() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/kiosk/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || null, siteId: siteId || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setLabel('')
      setSiteId('')
      setSuccess('Terminal créé avec succès.')
      fetchTokens()
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, lbl: string | null) => {
    if (!confirm(`Supprimer le terminal « ${lbl ?? id} » ? Les tablettes qui utilisent ce lien n'auront plus accès.`)) return
    const res = await fetch(`/api/admin/kiosk/tokens/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError('Erreur lors de la suppression'); return }
    setTokens(prev => prev.filter(t => t.id !== id))
  }

  const copyUrl = (token: string) => {
    const url = `${window.location.origin}/kiosk/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const kioskUrl = (token: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/kiosk/${token}` : `/kiosk/${token}`

  const planBlocked = plan && plan !== 'FREE' ? false : plan === 'FREE'

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Mode Kiosque</h1>
        <p className="text-[var(--pp-muted)] text-sm mt-1">
          Créez des terminaux de pointage pour tablettes — accès par PIN ou enregistrement visiteur.
        </p>
      </div>

      {plan === 'FREE' && (
        <div className="mb-6 p-4 rounded-xl border border-orange-200 bg-orange-50 flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-medium text-orange-800">Fonctionnalité non disponible sur le plan FREE</p>
            <p className="text-xs text-orange-600 mt-0.5">Le mode kiosque est disponible à partir du plan SOLO.</p>
            <a href="/pricing" className="inline-block mt-2 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-lg hover:opacity-90">
              Voir les plans →
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
      )}

      {/* Create form */}
      {!planBlocked && (
        <Card className="mb-6">
          <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-4">Créer un nouveau terminal</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-[var(--pp-muted)] mb-1">Libellé (optionnel)</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="ex: Accueil RDC"
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>
            {sites.length > 0 && (
              <div className="flex-1 min-w-40">
                <label className="block text-xs text-[var(--pp-muted)] mb-1">Site (optionnel)</label>
                <select
                  value={siteId}
                  onChange={e => setSiteId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                >
                  <option value="">— Tous les sites —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <Button type="submit" size="md" disabled={creating}>
              {creating ? 'Création…' : '+ Créer'}
            </Button>
          </form>
        </Card>
      )}

      {/* Token list */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-4">
          Terminaux actifs
          {tokens.length > 0 && (
            <span className="ml-2 text-xs font-normal text-[var(--pp-muted)]">({tokens.length})</span>
          )}
        </h2>

        {loading ? (
          <p className="text-[var(--pp-muted)] text-sm py-4 text-center">Chargement…</p>
        ) : tokens.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-4xl mb-3">🖥️</p>
            <p className="text-[var(--pp-muted)] text-sm">
              {planBlocked ? 'Passez au plan SOLO pour créer des terminaux.' : 'Aucun terminal créé. Créez-en un ci-dessus.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map(t => (
              <div key={t.id} className="p-4 rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg2)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--pp-ink)]">
                        {t.label ?? 'Terminal kiosque'}
                      </span>
                      {t.site && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--pp-info)]/10 text-[var(--pp-info)]">
                          {t.site.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--pp-muted)] mt-1 font-mono truncate max-w-xs">
                      {kioskUrl(t.token)}
                    </p>
                    <p className="text-xs text-[var(--pp-muted)] mt-0.5">
                      Créé le {new Date(t.createdAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => copyUrl(t.token)}>
                      {copied === t.token ? '✓ Copié' : 'Copier URL'}
                    </Button>
                    <a
                      href={kioskUrl(t.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline">Ouvrir</Button>
                    </a>
                    <button
                      onClick={() => handleDelete(t.id, t.label)}
                      className="text-xs text-[var(--pp-neg)] hover:underline px-1"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-3">Comment configurer le kiosque</h2>
        <ol className="space-y-2 text-sm text-[var(--pp-muted)]">
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--pp-info)]/15 text-[var(--pp-info)] flex items-center justify-center text-xs font-bold">1</span>
            Créez un terminal ci-dessus et copiez son URL.
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--pp-info)]/15 text-[var(--pp-info)] flex items-center justify-center text-xs font-bold">2</span>
            Sur la tablette, ouvrez l'URL en mode plein écran (navigateur kiosque ou PWA).
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--pp-info)]/15 text-[var(--pp-info)] flex items-center justify-center text-xs font-bold">3</span>
            Assignez un PIN à 4 chiffres à chaque employé dans{' '}
            <a href="/admin/dashboard/users" className="text-[var(--pp-info)] hover:underline">
              Utilisateurs
            </a>{' '}
            (bouton «&nbsp;PIN Kiosque&nbsp;»).
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--pp-info)]/15 text-[var(--pp-info)] flex items-center justify-center text-xs font-bold">4</span>
            Les employés tapent leur PIN pour pointer. Les visiteurs peuvent s'enregistrer et un email est envoyé à leur hôte.
          </li>
        </ol>
      </Card>
    </div>
  )
}
