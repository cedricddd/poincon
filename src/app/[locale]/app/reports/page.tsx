'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/Card'

type ClockRecord = {
  id: string
  arrivalTime: string
  departureTime: string | null
  duration: number | null
  location: string
  date: string
}

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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

  useEffect(() => {
    fetch('/api/user/balance').then(r => r.json()).then(setBalance)
  }, [])

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
    return d.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      <header className="sticky top-0 border-b border-[var(--pp-line)] bg-[var(--pp-bg)]/95 backdrop-blur py-4 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Mes rapports</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-0.5">Historique de pointage et solde</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">

        {/* Balance cards */}
        {balance && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Heures sup accumulées', value: `${balance.overtimeHours.toFixed(1)}h`, color: 'text-[var(--pp-pos)]' },
              { label: 'Récupération consommée', value: `${balance.rttHours.toFixed(1)}h`, color: 'text-[var(--pp-neg)]' },
              { label: 'Jours de congé', value: `${balance.daysOff}j`, color: 'text-[var(--pp-muted)]' },
              {
                label: 'Solde net',
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
          </div>
        </Card>

        {/* Stats */}
        {stats && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total heures', value: fmt(stats.totalMinutes) },
              { label: 'Moyenne / jour', value: fmt(stats.avgMinutes) },
              { label: 'Sans départ', value: String(stats.incompleteCount) },
            ].map(s => (
              <Card key={s.label}>
                <p className="text-xs text-[var(--pp-muted)] mb-1">{s.label}</p>
                <p className="text-lg font-bold text-[var(--pp-ink)]">{s.value}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Table */}
        <Card>
          {loading ? (
            <p className="text-center text-[var(--pp-muted)] text-sm py-10">Chargement…</p>
          ) : records.length === 0 ? (
            <p className="text-center text-[var(--pp-muted)] text-sm py-10 italic">Aucun pointage sur cette période.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Arrivée</th>
                    <th className="pb-3 pr-4 font-medium">Départ</th>
                    <th className="pb-3 pr-4 font-medium">Durée</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Lieu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pp-line)]">
                  {records.map(r => {
                    const incomplete = !r.departureTime
                    return (
                      <tr key={r.id} className={incomplete ? 'opacity-60' : ''}>
                        <td className="py-3 pr-4 text-[var(--pp-ink)] font-medium">{fmtDate(r.date)}</td>
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
                        <td className="py-3 hidden sm:table-cell text-xs text-[var(--pp-muted)]">{r.location}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--pp-line)]">
              <p className="text-xs text-[var(--pp-muted)]">Page {page} / {pages} — {total} pointages</p>
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
    </div>
  )
}
