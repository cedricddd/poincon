'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/Card'

type ClockRecord = {
  id: string
  arrivalTime: string
  departureTime: string | null
  duration: number | null
  location: string
  date: string
  user: { id: string; name: string | null; email: string }
  site: { id: string; name: string } | null
}

type Stats = {
  totalMinutes: number
  avgMinutes: number
  completedCount: number
  incompleteCount: number
  overtimeHours: number
}

type Employee = { id: string; name: string | null; email: string }
type Site = { id: string; name: string }

async function exportPDF(records: ClockRecord[], stats: Stats | null, filters: { from: string; to: string; userName: string; siteName: string }) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape' })

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PoinçOn — Rapport de pointage', 14, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  const subtitle = [
    filters.userName ? `Employé : ${filters.userName}` : 'Tous les employés',
    filters.siteName ? `Site : ${filters.siteName}` : '',
    filters.from ? `Du : ${filters.from}` : '',
    filters.to ? `Au : ${filters.to}` : '',
    `Exporté le : ${new Date().toLocaleDateString('fr-BE')}`,
  ].filter(Boolean).join('   |   ')
  doc.text(subtitle, 14, 25)

  // Stats
  if (stats) {
    doc.setFontSize(9)
    doc.setTextColor(60)
    const statLine = `Total : ${fmt(stats.totalMinutes)}   |   Moyenne/jour : ${fmt(stats.avgMinutes)}   |   Incomplets : ${stats.incompleteCount}   |   Heures sup : ${Number(stats.overtimeHours).toFixed(1)}h`
    doc.text(statLine, 14, 31)
  }

  // Table
  autoTable(doc, {
    startY: 36,
    head: [['Employé', 'Email', 'Date', 'Arrivée', 'Départ', 'Durée', 'Lieu', 'Site']],
    body: records.map(r => [
      r.user.name ?? '—',
      r.user.email,
      fmtDate(r.date),
      fmtTime(r.arrivalTime),
      r.departureTime ? fmtTime(r.departureTime) : 'Non pointé',
      r.duration != null ? fmt(r.duration) : '—',
      r.location,
      r.site?.name ?? '—',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  })

  const filename = `pointages_${filters.from || 'all'}_${filters.to || 'all'}.pdf`
  doc.save(filename)
}

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ReportsPage() {
  const [records, setRecords] = useState<ClockRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  // Filters
  const [userId, setUserId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState({ userId: '', siteId: '', from: '', to: '' })
  const [empSearch, setEmpSearch] = useState('')
  const [empOpen, setEmpOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(d => setEmployees(d.users ?? []))
    fetch('/api/admin/sites').then(r => r.ok ? r.json() : []).then(d => setSites(Array.isArray(d) ? d : []))
  }, [])

  const fetch_ = useCallback((f: typeof applied, p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (f.userId) params.set('userId', f.userId)
    if (f.siteId) params.set('siteId', f.siteId)
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
    fetch(`/api/admin/reports?${params}`)
      .then(r => r.json())
      .then(d => {
        setRecords(d.records ?? [])
        setStats(d.stats ?? null)
        setTotal(d.total ?? 0)
        setPages(d.pages ?? 1)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch_(applied, page) }, [fetch_, applied, page])

  const exportCSV = () => {
    const params = new URLSearchParams()
    if (applied.userId) params.set('userId', applied.userId)
    if (applied.siteId) params.set('siteId', applied.siteId)
    if (applied.from) params.set('from', applied.from)
    if (applied.to) params.set('to', applied.to)
    window.location.href = `/api/admin/reports/export?${params}`
  }

  const exportPDF_ = async () => {
    setExporting('pdf')
    try {
      // Fetch all records (no pagination) for PDF
      const params = new URLSearchParams({ page: '1' })
      if (applied.userId) params.set('userId', applied.userId)
      if (applied.siteId) params.set('siteId', applied.siteId)
      if (applied.from) params.set('from', applied.from)
      if (applied.to) params.set('to', applied.to)
      // Fetch all pages
      const allRecords: ClockRecord[] = []
      let p = 1, totalPages = 1
      do {
        params.set('page', String(p))
        const d = await fetch(`/api/admin/reports?${params}`).then(r => r.json())
        allRecords.push(...(d.records ?? []))
        totalPages = d.pages ?? 1
        p++
      } while (p <= totalPages)

      const userName = applied.userId
        ? employees.find(e => e.id === applied.userId)?.name ?? ''
        : ''
      const siteName = applied.siteId
        ? sites.find(s => s.id === applied.siteId)?.name ?? ''
        : ''
      await exportPDF(allRecords, stats, { from: applied.from, to: applied.to, userName, siteName })
    } finally {
      setExporting(null)
    }
  }

  const apply = () => {
    setPage(1)
    setApplied({ userId, siteId, from, to })
  }

  const reset = () => {
    setUserId(''); setSiteId(''); setFrom(''); setTo('')
    setEmpSearch(''); setEmpOpen(false)
    setPage(1)
    setApplied({ userId: '', siteId: '', from: '', to: '' })
  }

  const selectEmployee = (emp: Employee | null) => {
    setUserId(emp?.id ?? '')
    setEmpSearch(emp ? (emp.name ?? emp.email) : '')
    setEmpOpen(false)
  }

  const filteredEmployees = employees.filter(e => {
    const q = empSearch.toLowerCase()
    return !q || (e.name ?? '').toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
  })

  const hasFilter = applied.userId || applied.siteId || applied.from || applied.to

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Rapports de pointage</h1>
          <p className="text-[var(--pp-muted)] text-sm mt-1">
            Historique complet des pointages avec filtres par employé et période.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={exportCSV}
            disabled={loading || total === 0}
            className="flex items-center gap-1.5 px-4 py-2 border border-[var(--pp-line)] rounded-lg text-sm font-medium text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30 disabled:opacity-40 transition"
          >
            ↓ CSV
          </button>
          <button
            onClick={exportPDF_}
            disabled={loading || total === 0 || exporting === 'pdf'}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition"
          >
            {exporting === 'pdf' ? 'Génération…' : '↓ PDF'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative">
            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Employé</label>
            <input
              type="search"
              value={empSearch}
              onChange={e => { setEmpSearch(e.target.value); setUserId(''); setEmpOpen(true) }}
              onFocus={() => setEmpOpen(true)}
              onBlur={() => setTimeout(() => setEmpOpen(false), 150)}
              placeholder="Tous les employés…"
              className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] w-52"
            />
            {empOpen && (
              <div className="absolute z-10 mt-1 w-52 bg-[var(--pp-bg)] border border-[var(--pp-line)] rounded-lg shadow-lg max-h-52 overflow-y-auto">
                <button
                  type="button"
                  onMouseDown={() => selectEmployee(null)}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--pp-muted)] hover:bg-[var(--pp-line)]/30"
                >
                  Tous les employés
                </button>
                {filteredEmployees.map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onMouseDown={() => selectEmployee(e)}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30"
                  >
                    {e.name ?? e.email}
                    {e.name && <span className="block text-xs text-[var(--pp-muted)]">{e.email}</span>}
                  </button>
                ))}
                {filteredEmployees.length === 0 && (
                  <p className="px-3 py-2 text-xs text-[var(--pp-muted)] italic">Aucun résultat</p>
                )}
              </div>
            )}
          </div>
          {sites.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Site</label>
              <select
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] w-44"
              >
                <option value="">Tous les sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Du</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Au</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>
          <button
            onClick={apply}
            className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            Filtrer
          </button>
          {hasFilter && (
            <button
              onClick={reset}
              className="px-4 py-2 border border-[var(--pp-line)] text-[var(--pp-muted)] rounded-lg text-sm hover:text-[var(--pp-ink)] transition"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total heures', value: fmt(stats.totalMinutes), sub: `${total} pointages` },
            { label: 'Moyenne / jour', value: fmt(stats.avgMinutes), sub: `${stats.completedCount} journées complètes` },
            { label: 'Incomplets', value: String(stats.incompleteCount), sub: 'sans départ' },
            { label: 'Heures sup', value: `${Number(stats.overtimeHours).toFixed(1)}h`, sub: 'détectées sur la période' },
          ].map(s => (
            <Card key={s.label}>
              <p className="text-xs text-[var(--pp-muted)] mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-[var(--pp-ink)]">{s.value}</p>
              <p className="text-xs text-[var(--pp-muted)] mt-0.5">{s.sub}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      <Card>
        {loading ? (
          <p className="text-center text-[var(--pp-muted)] text-sm py-10">Chargement…</p>
        ) : records.length === 0 ? (
          <p className="text-center text-[var(--pp-muted)] text-sm py-10 italic">Aucun pointage trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                  <th className="pb-3 pr-4 font-medium">Employé</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Arrivée</th>
                  <th className="pb-3 pr-4 font-medium">Départ</th>
                  <th className="pb-3 pr-4 font-medium">Durée</th>
                  <th className="pb-3 pr-4 font-medium hidden md:table-cell">Lieu</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Site</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pp-line)]">
                {records.map(r => {
                  const incomplete = !r.departureTime
                  return (
                    <tr key={r.id} className={incomplete ? 'opacity-60' : ''}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[var(--pp-ink)]">{r.user.name ?? '—'}</p>
                        <p className="text-xs text-[var(--pp-muted)]">{r.user.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-[var(--pp-ink)]">{fmtDate(r.date)}</td>
                      <td className="py-3 pr-4 text-[var(--pp-ink)]">{fmtTime(r.arrivalTime)}</td>
                      <td className="py-3 pr-4">
                        {r.departureTime
                          ? <span className="text-[var(--pp-ink)]">{fmtTime(r.departureTime)}</span>
                          : <span className="text-xs italic text-[var(--pp-neg)]">Non pointé</span>
                        }
                      </td>
                      <td className="py-3 pr-4">
                        {r.duration != null
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--pp-info)]/10 text-[var(--pp-info)]">{fmt(r.duration)}</span>
                          : <span className="text-xs text-[var(--pp-muted)]">—</span>
                        }
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell text-xs text-[var(--pp-muted)]">{r.location}</td>
                      <td className="py-3 hidden md:table-cell text-xs text-[var(--pp-muted)]">{r.site?.name ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--pp-line)]">
            <p className="text-xs text-[var(--pp-muted)]">
              Page {page} / {pages} — {total} résultats
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg disabled:opacity-40 hover:bg-[var(--pp-line)]/30 transition"
              >
                ← Précédent
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg disabled:opacity-40 hover:bg-[var(--pp-line)]/30 transition"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
