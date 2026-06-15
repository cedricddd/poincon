'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/Card'

type Person = {
  id: string
  arrivalTime: string
  location: string
  onBreak: boolean
  user: { id: string; name: string; email: string }
  site: { id: string; name: string } | null
}

type Group = {
  site: { id: string; name: string } | null
  people: Person[]
}

type Visitor = {
  id: string
  visitorName: string
  visitorEmail: string
  arrivedAt: string
  departedAt: string | null
  host: { id: string; name: string | null }
}

type Data = {
  groups: Group[]
  total: number
  visitors: Visitor[]
  asOf: string
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}
function fmtAsOf(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function PresencePage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [filterSite, setFilterSite] = useState<string>('__all__')
  const [departingId, setDepartingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/presence')
    if (res.ok) {
      const d = await res.json()
      setData(d)
      setLastRefresh(d.asOf)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  const markDeparture = async (visitId: string) => {
    setDepartingId(visitId)
    try {
      const res = await fetch(`/api/admin/kiosk/visits/${visitId}`, { method: 'PATCH' })
      if (res.ok) {
        setData(prev => prev ? {
          ...prev,
          visitors: prev.visitors.filter(v => v.id !== visitId),
        } : prev)
      }
    } finally {
      setDepartingId(null)
    }
  }

  const totalOnSite = (data?.total ?? 0) + (data?.visitors?.length ?? 0)

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Présences en cours</h1>
          <p className="text-[var(--pp-muted)] text-sm mt-1">
            Employés et visiteurs sur site — mise à jour toutes les 60 s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-[var(--pp-muted)]">Actualisé à {fmtAsOf(lastRefresh)}</span>
          )}
          <button
            onClick={load}
            className="px-3 py-1.5 border border-[var(--pp-line)] rounded-lg text-xs font-medium text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30 transition"
          >
            ↻ Actualiser
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-[var(--pp-muted)] text-sm">Chargement…</p>
      ) : !data || totalOnSite === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-[var(--pp-ink)] font-medium">Aucune présence en cours</p>
            <p className="text-[var(--pp-muted)] text-sm mt-1">Personne n&apos;est actuellement sur site.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Total badge */}
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            {(data.total ?? 0) > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/30">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--pp-pos)] animate-pulse" />
                <span className="text-sm font-semibold text-[var(--pp-pos)]">
                  {data.total} employé{data.total > 1 ? 's' : ''} présent{data.total > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {(data.visitors?.length ?? 0) > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--pp-info)]/10 border border-[var(--pp-info)]/30">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--pp-info)] animate-pulse" />
                <span className="text-sm font-semibold text-[var(--pp-info)]">
                  {data.visitors.length} visiteur{data.visitors.length > 1 ? 's' : ''} sur site
                </span>
              </div>
            )}
          </div>

          {/* Site filter */}
          {data.groups.length > 1 && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilterSite('__all__')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  filterSite === '__all__'
                    ? 'bg-[var(--pp-info)] text-white border-[var(--pp-info)]'
                    : 'border-[var(--pp-line)] text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
                }`}
              >
                Tous ({data.total})
              </button>
              {data.groups.map((g, idx) => {
                const key = g.site?.id ?? '__none__'
                return (
                  <button
                    key={idx}
                    onClick={() => setFilterSite(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      filterSite === key
                        ? 'bg-[var(--pp-info)] text-white border-[var(--pp-info)]'
                        : 'border-[var(--pp-line)] text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
                    }`}
                  >
                    {g.site?.name ?? 'Sans site'} ({g.people.length})
                  </button>
                )
              })}
            </div>
          )}

          <div className="space-y-6">
            {/* ── Employees by site ── */}
            {data.groups.filter(g =>
              filterSite === '__all__' || (g.site?.id ?? '__none__') === filterSite
            ).map((group, idx) => (
              <Card key={idx}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--pp-info)]/10 flex items-center justify-center text-lg">🏢</div>
                    <h2 className="font-semibold text-[var(--pp-ink)]">
                      {group.site?.name ?? 'Site non renseigné'}
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[var(--pp-pos)]/10 text-[var(--pp-pos)] text-sm font-bold">
                    {group.people.length}
                  </span>
                </div>
                <div className="divide-y divide-[var(--pp-line)]">
                  {group.people.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.onBreak ? 'bg-amber-100 text-amber-600' : 'bg-[var(--pp-info)]/10 text-[var(--pp-info)]'}`}>
                          {(p.user.name || p.user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--pp-ink)]">{p.user.name || p.user.email}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-[var(--pp-muted)]">{p.location}</p>
                            {p.onBreak && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">En pause</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[var(--pp-muted)]">Arrivée</p>
                        <p className={`text-sm font-semibold ${p.onBreak ? 'text-amber-500' : 'text-[var(--pp-pos)]'}`}>{fmt(p.arrivalTime)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {/* ── Visitors block ── */}
            {(data.visitors?.length ?? 0) > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--pp-info)]/10 flex items-center justify-center text-lg">🏷️</div>
                    <div>
                      <h2 className="font-semibold text-[var(--pp-ink)]">Visiteurs sur site</h2>
                      <p className="text-xs text-[var(--pp-muted)]">Arrivées du jour sans départ enregistré</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[var(--pp-info)]/10 text-[var(--pp-info)] text-sm font-bold">
                    {data.visitors.length}
                  </span>
                </div>
                <div className="divide-y divide-[var(--pp-line)]">
                  {data.visitors.map(v => (
                    <div key={v.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[var(--pp-info)]/10 text-[var(--pp-info)] flex items-center justify-center text-xs font-bold shrink-0">
                          {v.visitorName[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--pp-ink)] truncate">{v.visitorName}</p>
                          <p className="text-xs text-[var(--pp-muted)] truncate">{v.visitorEmail}</p>
                          {v.host?.name && (
                            <p className="text-xs text-[var(--pp-muted)]">
                              Hôte : <span className="text-[var(--pp-ink)]">{v.host.name}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-[var(--pp-muted)]">Arrivée</p>
                          <p className="text-sm font-semibold text-[var(--pp-info)]">{fmt(v.arrivedAt)}</p>
                        </div>
                        <button
                          onClick={() => markDeparture(v.id)}
                          disabled={departingId === v.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--pp-line)] text-[var(--pp-muted)] hover:border-[var(--pp-neg)]/40 hover:text-[var(--pp-neg)] hover:bg-[var(--pp-neg)]/5 transition disabled:opacity-40"
                        >
                          {departingId === v.id ? '…' : '🚪 Départ'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
