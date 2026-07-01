"use client"
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { usePlan } from "@/hooks/usePlan"

interface Site {
  id: string
  name: string
  address: string | null
  active: boolean
  createdAt: string
  _count: { users: number }
}

interface QrData {
  token: string
  url: string
  qrDataUrl: string
  siteId: string
  siteName: string
}

function QrModal({ site, onClose }: { site: Site; onClose: () => void }) {
  const t = useTranslations('sites')
  const [qr, setQr] = useState<QrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/sites/${site.id}/qr`)
    if (res.ok) setQr(await res.json())
    setLoading(false)
  }

  async function rotate() {
    setRotating(true)
    const res = await fetch(`/api/admin/sites/${site.id}/qr`, { method: 'POST' })
    if (res.ok) setQr(await res.json())
    setRotating(false)
  }

  async function copy() {
    if (!qr) return
    await navigator.clipboard.writeText(qr.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function print() {
    if (!qr) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('qrTitle', { name: qr.siteName })}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; }
          img { width: 280px; height: 280px; display: block; margin: 0 auto 20px; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          p { color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>${t('printTitle', { name: qr.siteName })}</h1>
        <img src="${qr.qrDataUrl}" alt="QR Code" />
        <p>${t('printInstructions')}</p>
        <p style="font-size:12px; color:#999; margin-top:16px;">Pointon · pointon.be</p>
      </body>
      </html>
    `)
    w.document.close()
    w.print()
  }

  useEffect(() => { load() }, [site.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="bg-[var(--pp-bg)] rounded-2xl border border-[var(--pp-line)] shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--pp-line)]">
          <div>
            <h2 className="font-semibold text-[var(--pp-ink)]">{t('qrTitle', { name: site.name })}</h2>
            <p className="text-xs text-[var(--pp-muted)] mt-0.5">{t('qrSubtitle')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--pp-bg2)] transition-colors text-[var(--pp-muted)]">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* QR image */}
        <div className="flex flex-col items-center py-8 px-6 gap-4">
          {loading ? (
            <div className="w-[280px] h-[280px] rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg2)] flex items-center justify-center">
              <span className="text-sm text-[var(--pp-muted)]">{t('generating')}</span>
            </div>
          ) : qr ? (
            <>
              <div className="rounded-xl border-4 border-[var(--pp-line)] overflow-hidden bg-white">
                <img src={qr.qrDataUrl} alt="QR Code" width={280} height={280} />
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500">{t('qrError')}</p>
          )}
        </div>

        {/* Actions */}
        {qr && (
          <div className="px-6 pb-6 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={copy}
                className="flex-1 py-2.5 rounded-xl border border-[var(--pp-line)] text-sm font-medium text-[var(--pp-ink)] hover:bg-[var(--pp-bg2)] transition-colors"
              >
                {copied ? t('copied') : t('copyLink')}
              </button>
              <button
                onClick={print}
                className="flex-1 py-2.5 rounded-xl bg-[var(--pp-pos)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {t('print')}
              </button>
            </div>
            <button
              onClick={rotate}
              disabled={rotating}
              className="w-full py-2.5 rounded-xl border border-[var(--pp-line)] text-xs font-medium text-[var(--pp-muted)] hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-50"
            >
              {rotating ? t('rotating') : t('rotate')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SitesPage() {
  const t = useTranslations('sites')
  const { planInfo } = usePlan()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [form, setForm] = useState({ name: "", address: "" })
  const [submitting, setSubmitting] = useState(false)
  const [qrSite, setQrSite] = useState<Site | null>(null)

  async function fetchSites() {
    const res = await fetch("/api/admin/sites")
    const data = await res.json()
    setSites(data)
    setLoading(false)
  }

  useEffect(() => { fetchSites() }, [])

  function openNew() {
    setEditingSite(null)
    setForm({ name: "", address: "" })
    setShowForm(true)
    setError("")
  }

  function openEdit(site: Site) {
    setEditingSite(site)
    setForm({ name: site.name, address: site.address || "" })
    setShowForm(true)
    setError("")
  }

  function cancel() {
    setShowForm(false)
    setEditingSite(null)
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    const url = editingSite ? `/api/admin/sites/${editingSite.id}` : "/api/admin/sites"
    const method = editingSite ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t('errorGeneric'))
      setSubmitting(false)
      return
    }

    await fetchSites()
    cancel()
    setSubmitting(false)
  }

  async function toggleActive(site: Site) {
    await fetch(`/api/admin/sites/${site.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: site.name, address: site.address, active: !site.active }),
    })
    await fetchSites()
  }

  async function handleDelete(site: Site) {
    if (!confirm(t('confirmDelete', { name: site.name }))) return
    const res = await fetch(`/api/admin/sites/${site.id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error)
      return
    }
    await fetchSites()
  }

  const atSiteLimit = planInfo !== null && planInfo.maxSites !== -1 && sites.length >= planInfo.maxSites

  if (loading) return <div className="p-8 text-gray-500">{t('loading')}</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {qrSite && <QrModal site={qrSite} onClose={() => setQrSite(null)} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
            {planInfo && planInfo.maxSites !== -1 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                atSiteLimit ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {t('usage', { count: sites.length, max: planInfo.maxSites, plan: planInfo.plan })}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={atSiteLimit ? undefined : openNew}
          disabled={atSiteLimit}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            atSiteLimit
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {t('newSite')}
        </button>
      </div>

      {atSiteLimit && planInfo && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🔒</span>
              <span className="font-semibold text-gray-900">{t('limitTitle', { count: sites.length, max: planInfo.maxSites })}</span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{t('planBadgeTeam')}</span>
            </div>
            <p className="text-sm text-gray-600">
              {t('limitDesc', { plan: planInfo.plan, max: planInfo.maxSites })}
            </p>
          </div>
          <Link href="/pricing" className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90 whitespace-nowrap">
            {t('upgradeTeam')}
          </Link>
        </div>
      )}

      {showForm && (
        <div className="bg-[var(--pp-bg2)] rounded-xl border border-[var(--pp-line)] p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--pp-ink)]">
            {editingSite ? t('editSite') : t('createSite')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
                {t('nameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('namePlaceholder')}
                className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
                {t('addressLabel')} <span className="text-[var(--pp-muted)]">{t('optional')}</span>
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t('addressPlaceholder')}
                className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[var(--pp-info)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {submitting ? t('saving') : editingSite ? t('save') : t('create')}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="border border-[var(--pp-line)] text-[var(--pp-ink)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--pp-bg)] transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="text-center py-16 text-[var(--pp-muted)]">
          <div className="text-4xl mb-3">🏢</div>
          <p className="font-medium">{t('empty')}</p>
          <p className="text-sm mt-1">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className={`bg-[var(--pp-bg2)] rounded-xl border p-5 flex items-center justify-between ${
                site.active ? "border-[var(--pp-line)]" : "border-[var(--pp-line)] opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--pp-info)]/10 flex items-center justify-center text-[var(--pp-info)] font-bold text-lg">
                  {site.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--pp-ink)]">{site.name}</span>
                    {!site.active && (
                      <span className="text-xs bg-[var(--pp-bg)] text-[var(--pp-muted)] px-2 py-0.5 rounded-full">
                        {t('inactive')}
                      </span>
                    )}
                  </div>
                  {site.address && (
                    <p className="text-sm text-[var(--pp-muted)] mt-0.5">{site.address}</p>
                  )}
                  <p className="text-xs text-[var(--pp-muted)] mt-1">
                    {t('employeesAssigned', { count: site._count.users })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setQrSite(site)}
                  className="text-xs border border-[var(--pp-pos)]/40 text-[var(--pp-pos)] px-3 py-1.5 rounded-lg hover:bg-[var(--pp-pos)]/10 transition-colors flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                    <rect x="1" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="10" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="1" y="10" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="2.5" y="2.5" width="2" height="2" fill="currentColor"/>
                    <rect x="11.5" y="2.5" width="2" height="2" fill="currentColor"/>
                    <rect x="2.5" y="11.5" width="2" height="2" fill="currentColor"/>
                    <path d="M10 10h2v2h-2zM12 12h2v2h-2zM10 14h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  QR
                </button>
                <button
                  onClick={() => toggleActive(site)}
                  className="text-xs border border-[var(--pp-line)] text-[var(--pp-muted)] px-3 py-1.5 rounded-lg hover:bg-[var(--pp-bg)] transition-colors"
                >
                  {site.active ? t('deactivate') : t('activate')}
                </button>
                <button
                  onClick={() => openEdit(site)}
                  className="text-xs border border-[var(--pp-line)] text-[var(--pp-ink)] px-3 py-1.5 rounded-lg hover:bg-[var(--pp-bg)] transition-colors"
                >
                  {t('edit')}
                </button>
                <button
                  onClick={() => handleDelete(site)}
                  className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
