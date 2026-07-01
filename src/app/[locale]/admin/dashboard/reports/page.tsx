'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card } from '@/components/Card'
import { Link } from '@/i18n/navigation'
import { showToast } from '@/hooks/useToast'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

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

type ReportTemplate = {
  id: string
  name: string
  config: string
  scheduledFrequency: string | null
  recipientEmails: string | null
}

type TFn = (key: string, values?: Record<string, string | number>) => string

// ── Helpers ───────────────────────────────────────────────────────────────────

function today(): string { return new Date().toISOString().split('T')[0] }
function monthAgo(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]
}

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60); const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}
function fmtTime(iso: string, bcp: string) {
  return new Date(iso).toLocaleTimeString(bcp, { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string, bcp: string) {
  return new Date(iso).toLocaleDateString(bcp, { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtHours(h: number) {
  const hours = Math.floor(h); const mins = Math.round((h - hours) * 60)
  return mins > 0 ? `${hours}h${String(mins).padStart(2, '0')}` : `${hours}h`
}

const GROUP_KEYS: Record<string, string> = {
  employee: 'grpEmployee', team: 'grpTeam', week: 'grpWeek', month: 'grpMonth',
}

async function exportPDF(
  records: ClockRecord[],
  stats: Stats | null,
  filters: { from: string; to: string; userName: string; siteName: string },
  t: TFn,
  bcp: string
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text(t('pdfTitle'), 14, 18)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
  const subtitle = [
    filters.userName ? t('pdfEmployee', { name: filters.userName }) : t('pdfAllEmployees'),
    filters.siteName ? t('pdfSite', { name: filters.siteName }) : '',
    filters.from ? t('pdfFrom', { date: filters.from }) : '',
    filters.to ? t('pdfTo', { date: filters.to }) : '',
    t('pdfExportedOn', { date: new Date().toLocaleDateString(bcp) }),
  ].filter(Boolean).join('   |   ')
  doc.text(subtitle, 14, 25)
  if (stats) {
    doc.setFontSize(9); doc.setTextColor(60)
    doc.text(t('pdfSummary', {
      total: fmt(stats.totalMinutes),
      avg: fmt(stats.avgMinutes),
      incomplete: stats.incompleteCount,
      ot: Number(stats.overtimeHours).toFixed(1),
    }), 14, 31)
  }
  autoTable(doc, {
    startY: 36,
    head: [[t('employee'), t('email'), t('date'), t('arrival'), t('departure'), t('duration'), t('location'), t('site')]],
    body: records.map(r => [
      r.user.name ?? '—', r.user.email, fmtDate(r.date, bcp), fmtTime(r.arrivalTime, bcp),
      r.departureTime ? fmtTime(r.departureTime, bcp) : t('notClocked'),
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
  const t = useTranslations('reports')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
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
      await exportPDF(allRecords, stats, { from: applied.from, to: applied.to, userName, siteName }, t, bcp)
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
    if (!res.ok) {
      if (res.status === 403) showToast(t('customReportsAddonRequired'), 'error')
      setLoadingA(false)
      return
    }
    const data = await res.json()
    setAnalysisRows(data.rows ?? [])
    setTeams(data.teams ?? [])
    setAnalysisRan(true)
    setLoadingA(false)
  }, [aFrom, aTo, groupBy, aTeamId])

  const exportAnalysisCSV = () => {
    if (analysisRows.length === 0) return
    const lines = [t('csvAnalysisHeader')]
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

  // ── Report templates (addon_custom_reports) ─────────────────────────────
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateFrequency, setTemplateFrequency] = useState<'' | 'weekly' | 'monthly'>('')
  const [templateEmails, setTemplateEmails] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/admin/reports/templates')
    if (res.ok) setTemplates((await res.json()).templates ?? [])
  }, [])

  useEffect(() => { if (tab === 'analyse') fetchTemplates() }, [tab, fetchTemplates])

  const saveTemplate = async () => {
    if (!templateName.trim()) return
    setSavingTemplate(true)
    const emails = templateEmails.split(',').map(e => e.trim()).filter(Boolean)
    const res = await fetch('/api/admin/reports/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName.trim(),
        config: { groupBy, teamId: aTeamId || null },
        scheduledFrequency: templateFrequency || null,
        recipientEmails: emails,
      }),
    })
    if (res.ok) {
      setTemplateName(''); setTemplateFrequency(''); setTemplateEmails('')
      setShowSaveTemplate(false)
      showToast(t('templateSaved'), 'success')
      fetchTemplates()
    } else {
      const data = await res.json()
      showToast(data.error ?? t('error'), 'error')
    }
    setSavingTemplate(false)
  }

  const loadTemplate = (tpl: ReportTemplate) => {
    try {
      const config = JSON.parse(tpl.config)
      if (config.groupBy) setGroupBy(config.groupBy)
      setATeamId(config.teamId ?? '')
    } catch { /* invalid config */ }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm(t('confirmDeleteTemplate'))) return
    const res = await fetch(`/api/admin/reports/templates/${id}`, { method: 'DELETE' })
    if (res.ok) setTemplates(prev => prev.filter(tpl => tpl.id !== id))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const btnBase = 'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40'

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
          <p className="text-[var(--pp-muted)] text-sm mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {tab === 'pointages' && (
            <>
              <button onClick={exportCSV} disabled={loadingP || total === 0}
                className={`${btnBase} border border-[var(--pp-line)] text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30`}>
                {t('csvBtn')}
              </button>
              {isAdvanced && (
                <button onClick={exportPDF_} disabled={loadingP || total === 0 || exporting === 'pdf'}
                  className={`${btnBase} bg-[var(--pp-info)] text-white hover:opacity-90`}>
                  {exporting === 'pdf' ? t('generating') : t('pdfBtn')}
                </button>
              )}
            </>
          )}
          {tab === 'analyse' && analysisRan && analysisRows.length > 0 && (
            <button onClick={exportAnalysisCSV}
              className={`${btnBase} border border-[var(--pp-line)] text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30`}>
              {t('csvBtn')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 border-b border-[var(--pp-line)]">
        {[
          { key: 'pointages', label: t('tabPointages') },
          { key: 'analyse', label: t('tabAnalyse') },
        ].map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key as Tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === tb.key
                ? 'border-[var(--pp-info)] text-[var(--pp-info)]'
                : 'border-transparent text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
            }`}
          >
            {tb.label}
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
                  <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('employee')}</label>
                  <input
                    type="search"
                    value={empSearch}
                    onChange={e => { setEmpSearch(e.target.value); setUserId(''); setEmpOpen(true) }}
                    onFocus={() => setEmpOpen(true)}
                    onBlur={() => setTimeout(() => setEmpOpen(false), 150)}
                    placeholder={t('allEmployeesPlaceholder')}
                    className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] w-52"
                  />
                  {empOpen && (
                    <div className="absolute z-10 mt-1 w-52 bg-[var(--pp-bg)] border border-[var(--pp-line)] rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      <button type="button" onMouseDown={() => selectEmployee(null)}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--pp-muted)] hover:bg-[var(--pp-line)]/30">
                        {t('allEmployees')}
                      </button>
                      {filteredEmployees.map(e => (
                        <button key={e.id} type="button" onMouseDown={() => selectEmployee(e)}
                          className="w-full text-left px-3 py-2 text-sm text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30">
                          {e.name ?? e.email}
                          {e.name && <span className="block text-xs text-[var(--pp-muted)]">{e.email}</span>}
                        </button>
                      ))}
                      {filteredEmployees.length === 0 && (
                        <p className="px-3 py-2 text-xs text-[var(--pp-muted)] italic">{t('noResult')}</p>
                      )}
                    </div>
                  )}
                </div>
                {sites.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('site')}</label>
                    <select value={siteId} onChange={e => setSiteId(e.target.value)}
                      className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] w-44">
                      <option value="">{t('allSites')}</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('from')}</label>
                  <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                    className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('to')}</label>
                  <input type="date" value={to} onChange={e => setTo(e.target.value)}
                    className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
                </div>
                <button onClick={apply}
                  className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
                  {t('filter')}
                </button>
                {hasFilter && (
                  <button onClick={reset}
                    className="px-4 py-2 border border-[var(--pp-line)] text-[var(--pp-muted)] rounded-lg text-sm hover:text-[var(--pp-ink)] transition">
                    {t('reset')}
                  </button>
                )}
              </div>
            </Card>
          ) : (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--pp-line)] bg-[var(--pp-line)]/10 text-sm text-[var(--pp-muted)]">
              <span>🔒</span>
              <span>{t.rich('lockedFilters', { b: (c) => <strong className="text-[var(--pp-ink)]">{c}</strong> })}</span>
              <Link href="/admin/dashboard/settings" className="ml-auto shrink-0 px-3 py-1.5 bg-[var(--pp-info)] text-white rounded-lg text-xs font-medium hover:opacity-90 transition">
                {t('upgradeSolo')}
              </Link>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: t('totalHours'), value: fmt(stats.totalMinutes), sub: t('recordsCount', { count: total }) },
                { label: t('statAvgPerDay'), value: fmt(stats.avgMinutes), sub: t('completeDays', { count: stats.completedCount }) },
                { label: t('incomplete'), value: String(stats.incompleteCount), sub: t('withoutDeparture') },
                { label: t('overtimes'), value: `${Number(stats.overtimeHours).toFixed(1)}h`, sub: t('detectedInPeriod') },
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
              <p className="text-center text-[var(--pp-muted)] text-sm py-10">{t('loading')}</p>
            ) : records.length === 0 ? (
              <p className="text-center text-[var(--pp-muted)] text-sm py-10 italic">{t('noClockFound')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                      <th className="pb-3 pr-4 font-medium">{t('employee')}</th>
                      <th className="pb-3 pr-4 font-medium">{t('date')}</th>
                      <th className="pb-3 pr-4 font-medium">{t('arrival')}</th>
                      <th className="pb-3 pr-4 font-medium">{t('departure')}</th>
                      <th className="pb-3 pr-4 font-medium">{t('duration')}</th>
                      <th className="pb-3 pr-4 font-medium hidden md:table-cell">{t('location')}</th>
                      <th className="pb-3 font-medium hidden md:table-cell">{t('site')}</th>
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
                          <td className="py-3 pr-4 text-[var(--pp-ink)]">{fmtDate(r.date, bcp)}</td>
                          <td className="py-3 pr-4 text-[var(--pp-ink)]">{fmtTime(r.arrivalTime, bcp)}</td>
                          <td className="py-3 pr-4">
                            {r.departureTime
                              ? <span className="text-[var(--pp-ink)]">{fmtTime(r.departureTime, bcp)}</span>
                              : <span className="text-xs italic text-[var(--pp-neg)]">{t('notClocked')}</span>
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
                <p className="text-xs text-[var(--pp-muted)]">{t('pageInfo', { page, pages, total })}</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg disabled:opacity-40 hover:bg-[var(--pp-line)]/30 transition">
                    {t('prev')}
                  </button>
                  <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg disabled:opacity-40 hover:bg-[var(--pp-line)]/30 transition">
                    {t('next')}
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
                <label className="text-xs text-[var(--pp-muted)] block mb-1">{t('from')}</label>
                <input type="date" value={aFrom} onChange={e => setAFrom(e.target.value)}
                  className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--pp-muted)] block mb-1">{t('to')}</label>
                <input type="date" value={aTo} onChange={e => setATo(e.target.value)}
                  className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--pp-muted)] block mb-1">{t('groupByLabel')}</label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)}
                  className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]">
                  {Object.entries(GROUP_KEYS).map(([k, key]) => <option key={k} value={k}>{t(key)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--pp-muted)] block mb-1">{t('team')}</label>
                <select value={aTeamId} onChange={e => setATeamId(e.target.value)}
                  className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]">
                  <option value="">{t('allTeams')}</option>
                  {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={runAnalysis} disabled={loadingA}
                className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
                {loadingA ? t('calculating') : t('generate')}
              </button>
              <button onClick={() => setShowSaveTemplate(v => !v)}
                className="px-4 py-2 border border-[var(--pp-line)] text-[var(--pp-ink)] rounded-lg text-sm font-medium hover:bg-[var(--pp-line)]/30 transition">
                {t('saveAsTemplate')}
              </button>
            </div>

            {showSaveTemplate && (
              <div className="mt-4 pt-4 border-t border-[var(--pp-line)] flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label className="text-xs text-[var(--pp-muted)] block mb-1">{t('templateName')}</label>
                  <input value={templateName} onChange={e => setTemplateName(e.target.value)}
                    className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--pp-muted)] block mb-1">{t('templateFrequency')}</label>
                  <select value={templateFrequency} onChange={e => setTemplateFrequency(e.target.value as typeof templateFrequency)}
                    className="border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm bg-[var(--pp-bg)]">
                    <option value="">{t('templateFrequencyNone')}</option>
                    <option value="weekly">{t('templateFrequencyWeekly')}</option>
                    <option value="monthly">{t('templateFrequencyMonthly')}</option>
                  </select>
                </div>
                {templateFrequency && (
                  <div className="flex-1 min-w-48">
                    <label className="text-xs text-[var(--pp-muted)] block mb-1">{t('templateEmails')}</label>
                    <input value={templateEmails} onChange={e => setTemplateEmails(e.target.value)}
                      placeholder="a@co.be, b@co.be"
                      className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]" />
                  </div>
                )}
                <button onClick={saveTemplate} disabled={savingTemplate || !templateName.trim()}
                  className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {savingTemplate ? t('loading') : t('save')}
                </button>
              </div>
            )}

            {templates.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--pp-line)] flex flex-wrap gap-2">
                {templates.map(tpl => (
                  <div key={tpl.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--pp-line)] text-xs">
                    <button onClick={() => loadTemplate(tpl)} className="font-medium text-[var(--pp-ink)] hover:text-[var(--pp-info)]">
                      {tpl.name}
                    </button>
                    {tpl.scheduledFrequency && (
                      <span className="text-[var(--pp-muted)]">
                        ({tpl.scheduledFrequency === 'weekly' ? t('templateFrequencyWeekly') : t('templateFrequencyMonthly')})
                      </span>
                    )}
                    <button onClick={() => deleteTemplate(tpl.id)} className="text-[var(--pp-neg)] hover:underline">
                      {t('delete')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {analysisRan && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: t('kpiRecords'), value: totalRecords },
                  { label: t('kpiHours'), value: fmtHours(totalHoursA) },
                  { label: t('kpiTimeOff'), value: totalTimeOff },
                ].map(kpi => (
                  <Card key={kpi.label} className="text-center">
                    <p className="text-2xl font-bold text-[var(--pp-ink)]">{kpi.value}</p>
                    <p className="text-xs text-[var(--pp-muted)] mt-1">{kpi.label}</p>
                  </Card>
                ))}
              </div>

              {analysisRows.length === 0 ? (
                <p className="text-center py-12 text-[var(--pp-muted)] italic text-sm">{t('noData')}</p>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                          <th className="pb-3 pr-4 font-medium">{t(GROUP_KEYS[groupBy])}</th>
                          <th className="pb-3 pr-4 font-medium text-right">{t('thRecords')}</th>
                          <th className="pb-3 pr-4 font-medium text-right">{t('thHours')}</th>
                          <th className="pb-3 font-medium text-right">{t('thTimeOffDays')}</th>
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
                          <td className="pt-3 pr-4 text-xs text-[var(--pp-muted)]">{t('totalRow')}</td>
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
