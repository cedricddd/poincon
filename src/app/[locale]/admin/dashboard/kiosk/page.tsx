'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

type Site = { id: string; name: string }
type KioskToken = {
  id: string
  token: string
  label: string | null
  siteId: string | null
  site: Site | null
  theme: string
  visitorsEnabled: boolean
  createdAt: string
}

export default function KioskPage() {
  const t = useTranslations('kioskAdmin')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
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
  const [togglingTheme, setTogglingTheme] = useState<string | null>(null)
  const [togglingVisitors, setTogglingVisitors] = useState<string | null>(null)

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
      if (!res.ok) { setError(data.error ?? t('error')); return }
      setLabel('')
      setSiteId('')
      setSuccess(t('created'))
      fetchTokens()
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, lbl: string | null) => {
    if (!confirm(t('confirmDelete', { label: lbl ?? id }))) return
    const res = await fetch(`/api/admin/kiosk/tokens/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError(t('deleteError')); return }
    setTokens(prev => prev.filter(tk => tk.id !== id))
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

  const toggleVisitors = async (tok: KioskToken) => {
    setTogglingVisitors(tok.id)
    try {
      const res = await fetch(`/api/admin/kiosk/tokens/${tok.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorsEnabled: !tok.visitorsEnabled }),
      })
      if (res.ok) {
        setTokens(prev => prev.map(tk => tk.id === tok.id ? { ...tk, visitorsEnabled: !tok.visitorsEnabled } : tk))
      }
    } finally {
      setTogglingVisitors(null)
    }
  }

  const toggleTheme = async (tok: KioskToken) => {
    setTogglingTheme(tok.id)
    const newTheme = tok.theme === 'light' ? 'dark' : 'light'
    try {
      const res = await fetch(`/api/admin/kiosk/tokens/${tok.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      })
      if (res.ok) {
        setTokens(prev => prev.map(tk => tk.id === tok.id ? { ...tk, theme: newTheme } : tk))
      }
    } finally {
      setTogglingTheme(null)
    }
  }

  const planBlocked = plan && plan !== 'FREE' ? false : plan === 'FREE'

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
        <p className="text-[var(--pp-muted)] text-sm mt-1">
          {t('subtitle')}
        </p>
      </div>

      {plan === 'FREE' && (
        <div className="mb-6 p-4 rounded-xl border border-orange-200 bg-orange-50 flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-medium text-orange-800">{t('freeBlockedTitle')}</p>
            <p className="text-xs text-orange-600 mt-0.5">{t('freeBlockedDesc')}</p>
            <a href="/pricing" className="inline-block mt-2 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-lg hover:opacity-90">
              {t('seePlans')}
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
          <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-4">{t('createTitle')}</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-[var(--pp-muted)] mb-1">{t('labelOptional')}</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder={t('labelPlaceholder')}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>
            {sites.length > 0 && (
              <div className="flex-1 min-w-40">
                <label className="block text-xs text-[var(--pp-muted)] mb-1">{t('siteOptional')}</label>
                <select
                  value={siteId}
                  onChange={e => setSiteId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                >
                  <option value="">{t('allSites')}</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <Button type="submit" size="md" disabled={creating}>
              {creating ? t('creating') : t('createBtn')}
            </Button>
          </form>
        </Card>
      )}

      {/* Token list */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-4">
          {t('activeTerminals')}
          {tokens.length > 0 && (
            <span className="ml-2 text-xs font-normal text-[var(--pp-muted)]">({tokens.length})</span>
          )}
        </h2>

        {loading ? (
          <p className="text-[var(--pp-muted)] text-sm py-4 text-center">{t('loading')}</p>
        ) : tokens.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-4xl mb-3">🖥️</p>
            <p className="text-[var(--pp-muted)] text-sm">
              {planBlocked ? t('emptyBlocked') : t('emptyDefault')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map(tk => (
              <div key={tk.id} className="p-4 rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg2)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--pp-ink)]">
                        {tk.label ?? t('defaultTerminalName')}
                      </span>
                      {tk.site && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--pp-info)]/10 text-[var(--pp-info)]">
                          {tk.site.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--pp-muted)] mt-1 font-mono truncate max-w-xs">
                      {kioskUrl(tk.token)}
                    </p>
                    <p className="text-xs text-[var(--pp-muted)] mt-0.5">
                      {t('createdOn', { date: new Date(tk.createdAt).toLocaleDateString(bcp, { day: 'numeric', month: 'long', year: 'numeric' }) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => toggleVisitors(tk)}
                      disabled={togglingVisitors === tk.id}
                      title={tk.visitorsEnabled ? t('visitorsDisable') : t('visitorsEnable')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50"
                      style={tk.visitorsEnabled
                        ? { borderColor: 'rgba(16,185,129,0.35)', color: '#059669', background: 'rgba(16,185,129,0.07)' }
                        : { borderColor: 'rgba(156,163,175,0.35)', color: '#6b7280', background: 'rgba(156,163,175,0.07)' }
                      }
                    >
                      {tk.visitorsEnabled ? t('visitorsOn') : t('visitorsOff')}
                    </button>
                    <button
                      onClick={() => toggleTheme(tk)}
                      disabled={togglingTheme === tk.id}
                      title={tk.theme === 'light' ? t('toDark') : t('toLight')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50"
                      style={tk.theme === 'light'
                        ? { borderColor: 'rgba(212,168,83,0.4)', color: '#92640a', background: 'rgba(212,168,83,0.08)' }
                        : { borderColor: 'rgba(99,102,241,0.35)', color: '#4f46e5', background: 'rgba(99,102,241,0.06)' }
                      }
                    >
                      {tk.theme === 'light' ? t('themeLight') : t('themeDark')}
                    </button>
                    <Button size="sm" variant="outline" onClick={() => copyUrl(tk.token)}>
                      {copied === tk.token ? t('copied') : t('copyUrl')}
                    </Button>
                    <a href={kioskUrl(tk.token)} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">{t('open')}</Button>
                    </a>
                    <button
                      onClick={() => handleDelete(tk.id, tk.label)}
                      className="text-xs text-[var(--pp-neg)] hover:underline px-1"
                    >
                      {t('delete')}
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
        <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-3">{t('howTitle')}</h2>
        <ol className="space-y-2 text-sm text-[var(--pp-muted)]">
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--pp-info)]/15 text-[var(--pp-info)] flex items-center justify-center text-xs font-bold">1</span>
            {t('step1')}
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--pp-info)]/15 text-[var(--pp-info)] flex items-center justify-center text-xs font-bold">2</span>
            {t('step2')}
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--pp-info)]/15 text-[var(--pp-info)] flex items-center justify-center text-xs font-bold">3</span>
            <span>
              {t.rich('step3', {
                link: (c) => <Link href="/admin/dashboard/users" className="text-[var(--pp-info)] hover:underline">{c}</Link>,
              })}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--pp-info)]/15 text-[var(--pp-info)] flex items-center justify-center text-xs font-bold">4</span>
            {t('step4')}
          </li>
        </ol>
      </Card>
    </div>
  )
}
