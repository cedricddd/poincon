'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card } from '@/components/Card'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

const inp = 'px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]'

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-[var(--pp-info)]/10 text-[var(--pp-info)]',
  APPROVED: 'bg-[var(--pp-pos)]/10 text-[var(--pp-pos)]',
  REJECTED: 'bg-[var(--pp-neg)]/10 text-[var(--pp-neg)]',
}
const STATUS_KEY: Record<string, string> = {
  PENDING: 'statusPending', APPROVED: 'statusApproved', REJECTED: 'statusRejected',
}

type ClockRecord = {
  id: string
  arrivalTime: string
  departureTime: string | null
  duration: number | null
  location: string
  date: string
  editedAt: string | null
  editReason: string | null
  editNote: string | null
  editor: { name: string | null; email: string } | null
}

type CorrectionRequest = {
  id: string
  date: string
  requestedArrival: string | null
  requestedDeparture: string | null
  reason: string
  note: string | null
  status: string
  rejectionReason: string | null
  reviewer: { name: string | null } | null
}

const REASON_KEY: Record<string, string> = {
  forgot_clockin: 'reasonForgotIn',
  forgot_clockout: 'reasonForgotOut',
  correction: 'reasonCorrection',
  employee_request: 'reasonEmployeeRequest',
  manual_create: 'reasonManualCreate',
  other: 'reasonOther',
}

const REQUEST_REASONS = ['forgot_clockin', 'forgot_clockout', 'correction', 'other']

type Stats = {
  totalMinutes: number
  avgMinutes: number
  completedCount: number
  incompleteCount: number
}

type Balance = {
  overtimeHours: number
  rttHours: number
  daysOff: number
  balance: number
}

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function fmtTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Valeurs pour les <input type="date"|"time"> — en heure locale, jamais via toISOString()
function toDateInput(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toTimeInput(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function todayInput() {
  return toDateInput(new Date().toISOString())
}

// Default filter: current month
function defaultFrom() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function defaultTo() {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

export default function ReportsPage() {
  const t = useTranslations('myReports')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const [records, setRecords] = useState<ClockRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [applied, setApplied] = useState({ from: defaultFrom(), to: defaultTo() })

  const [corrections, setCorrections] = useState<CorrectionRequest[]>([])
  const [reportOpen, setReportOpen] = useState(false)
  const [reportErr, setReportErr] = useState('')
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    clockRecordId: '' as string,
    date: '',
    arrival: '',
    departure: '',
    reason: 'forgot_clockout',
    note: '',
  })

  useEffect(() => {
    fetch('/api/user/balance').then(r => r.json()).then(setBalance).catch(() => {})
  }, [])

  const fetchCorrections = useCallback(() => {
    fetch('/api/clock-corrections')
      .then(r => r.json())
      .then(d => setCorrections(d.requests ?? []))
      .catch(() => setCorrections([]))
  }, [])

  useEffect(() => { fetchCorrections() }, [fetchCorrections])

  const openReport = (r?: ClockRecord) => {
    setReportErr('')
    setForm({
      clockRecordId: r?.id ?? '',
      date: r ? toDateInput(r.date) : todayInput(),
      arrival: r ? toTimeInput(r.arrivalTime) : '',
      departure: r?.departureTime ? toTimeInput(r.departureTime) : '',
      // Un pointage ouvert = presque toujours un oubli de sortie
      reason: r && !r.departureTime ? 'forgot_clockout' : r ? 'correction' : 'forgot_clockin',
      note: '',
    })
    setReportOpen(true)
  }

  const submitReport = async () => {
    if (!form.date) { setReportErr(t('reportDateRequired')); return }
    if (!form.arrival && !form.departure) { setReportErr(t('reportTimeRequired')); return }
    if (form.reason === 'other' && !form.note.trim()) { setReportErr(t('reportNoteRequired')); return }

    setSending(true); setReportErr('')
    // ISO construit côté client : le conteneur tourne en UTC, la saisie est en heure locale
    const res = await fetch('/api/clock-corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clockRecordId: form.clockRecordId || undefined,
        date: form.date,
        requestedArrival: form.arrival ? new Date(`${form.date}T${form.arrival}:00`).toISOString() : null,
        requestedDeparture: form.departure ? new Date(`${form.date}T${form.departure}:00`).toISOString() : null,
        reason: form.reason,
        note: form.note.trim() || undefined,
      }),
    })
    setSending(false)
    if (!res.ok) { setReportErr((await res.json()).error ?? t('reportFailed')); return }
    setReportOpen(false)
    fetchCorrections()
  }

  const fetchRecords = useCallback((f: typeof applied, p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
    fetch(`/api/user/records?${params}`)
      .then(r => r.json())
      .then(d => {
        setRecords(d.records ?? [])
        setStats(d.stats ?? null)
        setTotal(d.total ?? 0)
        setPages(d.pages ?? 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchRecords(applied, page) }, [fetchRecords, applied, page])

  const apply = () => { setPage(1); setApplied({ from, to }) }
  const setMonth = (offset: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() + offset)
    const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const t = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    setFrom(f); setTo(t)
    setPage(1); setApplied({ from: f, to: t })
  }

  const monthLabel = (offset: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() + offset)
    return d.toLocaleDateString(bcp, { month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      <header className="sticky top-0 border-b border-[var(--pp-line)] bg-[var(--pp-bg)]/95 backdrop-blur py-4 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-0.5">{t('subtitle')}</p>
        </div>
      </header>

      {/* Signalement d'un oubli de pointage */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setReportOpen(false)}>
          <div
            className="bg-[var(--pp-bg)] rounded-xl border border-[var(--pp-line)] shadow-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-[var(--pp-ink)] mb-1">{t('reportTitle')}</p>
            <p className="text-xs text-[var(--pp-muted)] mb-4">{t('reportHint')}</p>

            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('date')}</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className={`${inp} w-full mb-3`}
            />

            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('arrival')}</label>
                <input
                  type="time"
                  value={form.arrival}
                  onChange={e => setForm(p => ({ ...p, arrival: e.target.value }))}
                  className={`${inp} w-full`}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('departure')}</label>
                <input
                  type="time"
                  value={form.departure}
                  onChange={e => setForm(p => ({ ...p, departure: e.target.value }))}
                  className={`${inp} w-full`}
                />
              </div>
            </div>

            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('reason')}</label>
            <select
              value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              className={`${inp} w-full mb-3`}
            >
              {REQUEST_REASONS.map(r => <option key={r} value={r}>{t(REASON_KEY[r])}</option>)}
            </select>

            <textarea
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder={t('reportNotePlaceholder')}
              rows={2}
              className={`${inp} w-full mb-3 resize-none`}
            />

            {reportErr && <p className="text-xs text-[var(--pp-neg)] mb-3">{reportErr}</p>}

            <div className="flex gap-2">
              <button
                onClick={submitReport}
                disabled={sending}
                className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {sending ? '…' : t('reportSubmit')}
              </button>
              <button
                onClick={() => setReportOpen(false)}
                className="px-4 py-2 border border-[var(--pp-line)] rounded-lg text-sm font-medium text-[var(--pp-muted)] hover:bg-[var(--pp-line)]/30 transition"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">

        {/* Balance cards */}
        {balance && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('overtimeAccrued'), value: `${balance.overtimeHours.toFixed(1)}h`, color: 'text-[var(--pp-pos)]' },
              { label: t('rttConsumed'), value: `${balance.rttHours.toFixed(1)}h`, color: 'text-[var(--pp-neg)]' },
              { label: t('daysOff'), value: `${balance.daysOff}${t('daysSuffix')}`, color: 'text-[var(--pp-muted)]' },
              {
                label: t('netBalance'),
                value: `${balance.balance >= 0 ? '+' : ''}${balance.balance.toFixed(1)}h`,
                color: balance.balance >= 0 ? 'text-[var(--pp-pos)]' : 'text-[var(--pp-neg)]',
              },
            ].map(c => (
              <Card key={c.label}>
                <p className="text-xs text-[var(--pp-muted)] mb-1">{c.label}</p>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-2 mb-3">
            {[-2, -1, 0].map(offset => (
              <button
                key={offset}
                onClick={() => setMonth(offset)}
                className="px-3 py-1.5 border border-[var(--pp-line)] rounded-lg text-xs font-medium text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30 transition capitalize"
              >
                {monthLabel(offset)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('from')}</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('to')}</label>
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
              {t('filter')}
            </button>
          </div>
        </Card>

        {/* Stats */}
        {stats && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: t('totalHours'), value: fmt(stats.totalMinutes) },
              { label: t('avgPerDay'), value: fmt(stats.avgMinutes) },
              { label: t('noDeparture'), value: String(stats.incompleteCount) },
            ].map(s => (
              <Card key={s.label}>
                <p className="text-xs text-[var(--pp-muted)] mb-1">{s.label}</p>
                <p className="text-lg font-bold text-[var(--pp-ink)]">{s.value}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Demandes de correction */}
        <Card>
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('correctionsTitle')}</h2>
            <button
              onClick={() => openReport()}
              className="px-3 py-1.5 border border-[var(--pp-info)] text-[var(--pp-info)] rounded-lg text-xs font-medium hover:bg-[var(--pp-info)]/10 transition whitespace-nowrap"
            >
              {t('reportButton')}
            </button>
          </div>
          <p className="text-xs text-[var(--pp-muted)]">{t('correctionsHint')}</p>

          {corrections.length > 0 && (
            <ul className="mt-4 space-y-2">
              {corrections.slice(0, 5).map(c => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 text-xs border-t border-[var(--pp-line)] pt-2">
                  <span className="text-[var(--pp-ink)] font-medium">{fmtDate(c.date, bcp)}</span>
                  <span className="text-[var(--pp-muted)]">{t(REASON_KEY[c.reason] ?? 'reasonCorrection')}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[c.status] ?? ''}`}>
                    {t(STATUS_KEY[c.status] ?? 'statusPending')}
                  </span>
                  {c.status === 'REJECTED' && c.rejectionReason && (
                    <span className="text-[var(--pp-muted)] italic w-full">{c.rejectionReason}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <p className="text-center text-[var(--pp-muted)] text-sm py-10">{t('loading')}</p>
          ) : records.length === 0 ? (
            <p className="text-center text-[var(--pp-muted)] text-sm py-10 italic">{t('empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                    <th className="pb-3 pr-4 font-medium">{t('date')}</th>
                    <th className="pb-3 pr-4 font-medium">{t('arrival')}</th>
                    <th className="pb-3 pr-4 font-medium">{t('departure')}</th>
                    <th className="pb-3 pr-4 font-medium">{t('duration')}</th>
                    <th className="pb-3 pr-4 font-medium hidden sm:table-cell">{t('location')}</th>
                    <th className="pb-3 font-medium"><span className="sr-only">{t('actions')}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pp-line)]">
                  {records.map(r => {
                    const incomplete = !r.departureTime
                    return (
                      <tr key={r.id} className={incomplete ? 'opacity-60' : ''}>
                        <td className="py-3 pr-4 text-[var(--pp-ink)] font-medium">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {fmtDate(r.date, bcp)}
                            {r.editedAt && (
                              <span
                                title={[
                                  `${t(REASON_KEY[r.editReason ?? ''] ?? 'reasonCorrection')} — ${r.editor?.name ?? r.editor?.email ?? ''}`,
                                  `${fmtDate(r.editedAt, bcp)} ${fmtTime(r.editedAt, bcp)}`,
                                  r.editNote,
                                ].filter(Boolean).join('\n')}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--pp-peach)]/10 text-[var(--pp-peach)] cursor-help"
                              >
                                ✎ {t('editedBadge')}
                              </span>
                            )}
                          </div>
                        </td>
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
                        <td className="py-3 pr-4 hidden sm:table-cell text-xs text-[var(--pp-muted)]">{r.location}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openReport(r)}
                            className="text-xs text-[var(--pp-info)] hover:underline whitespace-nowrap"
                          >
                            {t('reportButton')}
                          </button>
                        </td>
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
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg disabled:opacity-40 hover:bg-[var(--pp-line)]/30 transition"
                >
                  {t('prev')}
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg disabled:opacity-40 hover:bg-[var(--pp-line)]/30 transition"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
