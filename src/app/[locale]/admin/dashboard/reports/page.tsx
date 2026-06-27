'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/Card'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'pointages' | 'analyse'

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

type AnalysisRow = { key: string; label: string; recordCount: number; totalHours: number; timeOffDays: number }

type Employee = { id: string; name: string | null; email: string }
type Site = { id: string; name: string }
type Team = { id: string; name: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function today(): string { return new Date().toISOString().split('T')[0] }
function monthAgo(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]
}

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60); const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtHours(h: number) {
  const hours = Math.floor(h); const mins = Math.round((h - hours) * 60)
  return mins > 0 ? `${hours}h${String(mins).padStart(2, '0')}` : `${hours}h`
}

const GROUP_LABELS: Record<string, string> = {
  employee: 'Employé', team: 'Équipe', week: 'Semaine', month: 'Mois',
}

async function exportPDF(
  records: ClockRecord[],
  stats: Stats | null,
  filters: { from: string; to: string; userName: string; siteName: string }
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('Pointon — Rapport de pointage', 14, 18)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
  const subtitle = [
    filters.userName ? `Employé : ${filters.userName}` : 'Tous les employés',
    filters.siteName ? `Site : ${filters.siteName}` : '',
    filters.from ? `Du : ${filters.from}` : '',
    filters.to ? `Au : ${filters.to}` : '',
    `Exporté le : ${new Date().toLocaleDateString('fr-BE')}`,
  ].filter(Boolean).join('   |   ')
  doc.text(subtitle, 14, 25)
  if (stats) {
    doc.setFontSize(9); doc.setTextColor(60)
    doc.text(`Total : ${fmt(stats.totalMinutes)}   |   Moyenne/jour : ${fmt(stats.avgMinutes)}   |   Incomplets : ${stats.incompleteCount}   |   Heures sup : ${Number(stats.overtimeHours).toFixed(1)}h`, 14, 31)
  }
  autoTable(doc, {
    startY: 36,
    head: [['Employé', 'Email', 'Date', 'Arrivée', 'Départ', 'Durée', 'Lieu', 'Site']],
    body: records.map(r => [
      r.user.name ?? '—', r.user.email, fmtDate(r.date), fmtTime(r.arrivalTime),
      r.departureTime ? fmtTime(r.departureTime) : 'Non pointé',
      r.duration != null ? fmt(r.duration) : '—', r.location, r.site?.name ?? '—',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  })
  doc.save(`pointages_${filters.from || 'all'}_${filters.to || 'all'}.pdf`)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('pointages')

  // ── Shared ───────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([])
  const [sites, setSites] = useState<Site[]>([])

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(d => setEmployees(d.users ?? []))
    fetch('/api/admin/sites').then(r => r.ok ? r.json() : []).then(d => setSites(Array.isArray(d) ? d : []))
  }, [])

  // ── Pointages state ───────────────────────────────────────────────────────
  const [records, setRecords] = useState<ClockRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [loadingP, setLoadingP] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [exporting, setExporting] = useState<'pdf' | null>(null)
  const [userId, setUserId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState({ userId: '', siteId: '', from: '', to: '' })
  const [empSearch, setEmpSearch] = useState('')
  const [empOpen, setEmpOpen] = useState(false)

  const fetchRecords = useCallback((f: typeof applied, p: number) => {
    setLoadingP(true)
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
        setIsAdvanced(d.isAdvanced ?? false)
        setTotal(d.total ?? 0)
        setPages(d.pages ?? 1)
      })
      .finally(() => setLoadingP(false))
  }, [])

  useEffect(() => { fetchRecords(applied, page) }, [fetchRecords, applied, page])

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
      const params = new URLSearchParams()
      if (applied.userId) params.set('userId', applied.userId)
      if (applied.siteId) params.set('siteId', applied.siteId)
      if (applied.from) params.set('from', applied.from)
      if (applied.to) params.set('to', applied.to)
      const allRecords: ClockRecord[] = []
      let p = 1, totalPages = 1
      do {
        params.set('page', String(p))
        const d = await fetch(`/api/admin/reports?${params}`).then(r => r.json())
        allRecords.push(...(d.records ?? []))
        totalPages = d.pages ?? 1
        p++
      } while (p <= totalPages)
      const userName = applied.userId ? employees.find(e => e.id === applied.userId)?.name ?? '' : ''
      const siteName = applied.siteId ? sites.find(s => s.id === applied.siteId)?.name ?? '' : ''
      await exportPDF(allRecords, stats, { from: applied.from, to: applied.to, userName, siteName })
    } finally { setExporting(null) }
  }

  const apply = () => { setPage(1); setApplied({ userId, siteId, from, to }) }
  const reset = () => {
    setUserId(''); setSiteId(''); setFrom(''); setTo('')
    setEmpSearch(''); setEmpOpen(false)
    setPage(1); setApplied({ userId: '', siteId: '', from: '', to: '' })
  }
  const selectEmployee = (emp: Employee | null) => {
    setUserId(emp?.id ?? ''); setEmpSearch(emp ? (emp.name ?? emp.email) : ''); setEmpOpen(false)
  }
  const filteredEmployees = employees.filter(e => {
    const q = empSearch.toLowerCase()
    return !q || (e.name ?? '').toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
  })
  const hasFilter = applied.userId || applied.siteId || applied.from || applied.to

  // ── Analyse state ─────────────────────────────────────────────────────────
  const [analysisRows, setAnalysisRows] = useState<AnalysisRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [aFrom, setAFrom] = useState(monthAgo)
  const [aTo, setATo] = useState(today)
  const [groupBy, setGroupBy] = useState<'employee' | 'team' | 'week' | 'month'>('employee')
  const [aTeamId, setATeamId] = useState('')
  const [loadingA, setLoadingA] = useState(false)
  const [analysisRan, setAnalysisRan] = useState(false)

  const runAnalysis = useCallback(async () => {
    setLoadingA(true)
    const params = new URLSearchParams({ from: aFrom, to: aTo, groupBy })
    if (aTeamId) params.set('teamId', aTeamId)
    const res = await fetch(`/api/admin/reports/custom?${params}`)
    if (!res.ok) { setLoadingA(false); return }
    const data = await res.json()
    setAnalysisRows(data.rows ?? [])
    setTeams(data.teams ?? [])
    setAnalysisRan(true)
    setLoadingA(false)
  }, [aFrom, aTo, groupBy, aTeamId])

  const exportAnalysisCSV = () => {
    if (analysisRows.length === 0) return
    const lines = ['Groupe;Pointages;Heures travaillées;Jours de congés']
    for (const r of analysisRows) {
      lines.push([r.label, r.recordCount, r.totalHours.toFixed(2), r.timeOffDays].join(';'))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `analyse_${aFrom}_${aTo}.csv`; a.click()
  }

  const totalRecords = analysisRows.reduce((s, r) => s + r.recordCount, 0)
  const totalHoursA = analysisRows.reduce((s, r) => s + r.totalHours, 0)
  const totalTimeOff = analysisRows.reduce((s, r) => s + r.timeOffDays, 0)

  // ── Render ────────────────────────────────────────────────────────────────

  const btnBase = 'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40'

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Rapports</h1>
          <p className="text-[var(--pp-muted)] text-sm mt-1">Historique des pointages et analyse RH.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {tab === 'pointages' && (
            <>
              <button onClick={exportCSV} disabled={loadingP || total === 0}
                className={`${btnBase} border border-[var(--pp-line)] text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30`}>
                ↓ CSV
              </button>
              {isAdvanced && (
                <button onClick={exportPDF_} disabled={loadingP || total === 0 || exporting === 'pdf'}
                  className={`${btnBase} bg-[var(--pp-info)] text-white hover:opacity-90`}>
                  {exporting === 'pdf' ? 'Génération…' : '↓ PDF'}
                </button>
              )}
            </>
          )}
          {tab === 'analyse' && analysisRan && analysisRows.length > 0 && (
            <button onClick={exportAnalysisCSV}
              className={`${btnBase} border border-[var(--pp-line)] text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30`}>
              ↓ CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 border-b border-[var(--pp-line)]">
        {[
          { key: 'pointages', label: 'Pointages' },
          { key: 'analyse', label: 'Analyse RH' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-[var(--pp-info)] text-[var(--pp-info)]'
                : 'border-transparent text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Pointages tab ────────────────────────────────────────────────────── */}
      {tab === 'pointages' && (
        <>
          {isAdvanced ? (
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
                      <button type="button" onMouseDown={() => selectEmployee(null)}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--pp-muted)] hover:bg-[var(--pp-line)]/30">
                        Tous les employés
                      </button>
                      {filteredEmployees.map(e => (
                        <button key={e.id} type="button" onMouseDown={() => selectEmployee(e)}
                          className="w-full text-left px-3 py-2 text-sm text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30">
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
                    <select value={siteId} onChange={e => setSiteId(e.target.value)}
                      className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] w-44">
                      <option value="">Tous les sites</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Du</label>
                  <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                    className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Au</label>
                  <input type="date" value={to} onChange={e => setTo(e.target.value)}
                    className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
                </div>
                <button onClick={apply}
                  className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
                  Filtrer
                </button>
                {hasFilter && (
                  <button onClick={reset}
                    className="px-4 py-2 border border-[var(--pp-line)] text-[var(--pp-muted)] rounded-lg text-sm hover:text-[var(--pp-ink)] transition">
                    Réinitialiser
                  </button>
                )}
              </div>
            </Card>
          ) : (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--pp-line)] bg-[var(--pp-line)]/10 text-sm text-[var(--pp-muted)]">
              <span>🔒</span>
              <span>Filtres par employé, site et période disponibles à partir du plan <strong className="text-[var(--pp-ink)]">Solo</strong>.</span>
              <Link href="/admin/dashboard/settings" className="ml-auto shrink-0 px-3 py-1.5 bg-[var(--pp-info)] text-white rounded-lg text-xs font-medium hover:opacity-90 transition">
                Passer à Solo
              </Link>
            </div>
          )}

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

          <Card>
            {loadingP ? (
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
            {pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--pp-line)]">
                <p className="text-xs text-[var(--pp-muted)]">Page {page} / {pages} — {total} résultats</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg disabled:opacity-40 hover:bg-[var(--pp-line)]/30 transition">
                    ← Précédent
                  </button>
                  <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg disabled:opacity-40 hover:bg-[var(--pp-line)]/30 transition">
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Analyse tab ───────────────────────────────────────────────────────── */}
      {tab === 'analyse' && (
        <>
          <Card className="mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="text-xs text-[var(--pp-muted)] block mb-1">Du</label>
                <input type="date" value={aFrom} onChange={e => setAFrom(e.target.value)}
                  className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--pp-muted)] block mb-1">Au</label>
                <input type="date" value={aTo} onChange={e => setATo(e.target.value)}
                  className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--pp-muted)] block mb-1">Regrouper par</label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)}
                  className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]">
                  {Object.entries(GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--pp-muted)] block mb-1">Équipe</label>
                <select value={aTeamId} onChange={e => setATeamId(e.target.value)}
                  className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]">
                  <option value="">Toutes</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={runAnalysis} disabled={loadingA}
              className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
              {loadingA ? 'Calcul…' : 'Générer le rapport'}
            </button>
          </Card>

          {analysisRan && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Pointages', value: totalRecords },
                  { label: 'Heures travaillées', value: fmtHours(totalHoursA) },
                  { label: 'Jours de congés', value: totalTimeOff },
                ].map(kpi => (
                  <Card key={kpi.label} className="text-center">
                    <p className="text-2xl font-bold text-[var(--pp-ink)]">{kpi.value}</p>
                    <p className="text-xs text-[var(--pp-muted)] mt-1">{kpi.label}</p>
                  </Card>
                ))}
              </div>

              {analysisRows.length === 0 ? (
                <p className="text-center py-12 text-[var(--pp-muted)] italic text-sm">Aucune donnée pour ces filtres.</p>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                          <th className="pb-3 pr-4 font-medium">{GROUP_LABELS[groupBy]}</th>
                          <th className="pb-3 pr-4 font-medium text-right">Pointages</th>
                          <th className="pb-3 pr-4 font-medium text-right">Heures</th>
                          <th className="pb-3 font-medium text-right">Congés (j)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--pp-line)]">
                        {analysisRows.map(row => (
                          <tr key={row.key} className="hover:bg-[var(--pp-line)]/10">
                            <td className="py-3 pr-4 font-medium text-[var(--pp-ink)]">{row.label}</td>
                            <td className="py-3 pr-4 text-right text-[var(--pp-ink)]">{row.recordCount}</td>
                            <td className="py-3 pr-4 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--pp-info)]/10 text-[var(--pp-info)]">
                                {fmtHours(row.totalHours)}
                              </span>
                            </td>
                            <td className="py-3 text-right text-[var(--pp-muted)]">{row.timeOffDays}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[var(--pp-line)] font-semibold">
                          <td className="pt-3 pr-4 text-xs text-[var(--pp-muted)]">Total</td>
                          <td className="pt-3 pr-4 text-right text-[var(--pp-ink)]">{totalRecords}</td>
                          <td className="pt-3 pr-4 text-right text-[var(--pp-ink)]">{fmtHours(totalHoursA)}</td>
                          <td className="pt-3 text-right text-[var(--pp-muted)]">{totalTimeOff}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
