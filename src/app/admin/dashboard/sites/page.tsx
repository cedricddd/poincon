"use client"
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePlan } from "@/hooks/usePlan"

interface Site {
  id: string
  name: string
  address: string | null
  active: boolean
  createdAt: string
  _count: { users: number }
}

export default function SitesPage() {
  const { planInfo, upgradeTo } = usePlan()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [form, setForm] = useState({ name: "", address: "" })
  const [submitting, setSubmitting] = useState(false)

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
      setError(data.error || "Une erreur est survenue")
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
    if (!confirm(`Supprimer le site "${site.name}" ?`)) return
    const res = await fetch(`/api/admin/sites/${site.id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error)
      return
    }
    await fetchSites()
  }

  const atSiteLimit = planInfo !== null && planInfo.maxSites !== -1 && sites.length >= planInfo.maxSites

  if (loading) return <div className="p-8 text-gray-500">Chargement...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">Gérez les sites de votre entreprise</p>
            {planInfo && planInfo.maxSites !== -1 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                atSiteLimit ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {sites.length}/{planInfo.maxSites} site{planInfo.maxSites > 1 ? 's' : ''} ({planInfo.plan})
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
          + Nouveau site
        </button>
      </div>

      {atSiteLimit && planInfo && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🔒</span>
              <span className="font-semibold text-gray-900">Limite de sites atteinte ({sites.length}/{planInfo.maxSites})</span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Plan TEAM</span>
            </div>
            <p className="text-sm text-gray-600">
              Le plan {planInfo.plan} est limité à {planInfo.maxSites} site{planInfo.maxSites > 1 ? 's' : ''}. Passez au plan TEAM pour gérer plusieurs sites.
            </p>
          </div>
          <Link href="/pricing" className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90 whitespace-nowrap">
            Upgrader vers TEAM
          </Link>
        </div>
      )}

      {showForm && (
        <div className="bg-[var(--pp-bg2)] rounded-xl border border-[var(--pp-line)] p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--pp-ink)]">
            {editingSite ? "Modifier le site" : "Nouveau site"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
                Nom du site <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex : Pepinster, Loncin..."
                className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
                Adresse <span className="text-[var(--pp-muted)]">(optionnel)</span>
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="ex : Rue de la Gare 1, 4860 Pepinster"
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
                {submitting ? "Enregistrement..." : editingSite ? "Enregistrer" : "Créer"}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="border border-[var(--pp-line)] text-[var(--pp-ink)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--pp-bg)] transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="text-center py-16 text-[var(--pp-muted)]">
          <div className="text-4xl mb-3">🏢</div>
          <p className="font-medium">Aucun site configuré</p>
          <p className="text-sm mt-1">Créez votre premier site pour commencer</p>
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
                        Inactif
                      </span>
                    )}
                  </div>
                  {site.address && (
                    <p className="text-sm text-[var(--pp-muted)] mt-0.5">{site.address}</p>
                  )}
                  <p className="text-xs text-[var(--pp-muted)] mt-1">
                    {site._count.users} employé{site._count.users !== 1 ? "s" : ""} assigné{site._count.users !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(site)}
                  className="text-xs border border-[var(--pp-line)] text-[var(--pp-muted)] px-3 py-1.5 rounded-lg hover:bg-[var(--pp-bg)] transition-colors"
                >
                  {site.active ? "Désactiver" : "Activer"}
                </button>
                <button
                  onClick={() => openEdit(site)}
                  className="text-xs border border-[var(--pp-line)] text-[var(--pp-ink)] px-3 py-1.5 rounded-lg hover:bg-[var(--pp-bg)] transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(site)}
                  className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
