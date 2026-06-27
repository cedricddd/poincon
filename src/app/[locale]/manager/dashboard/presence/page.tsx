'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/Card'

type Person = {
  id: string
  user: { id: string; name: string; email: string }
  site: { id: string; name: string } | null
  location: string
}

type Group = {
  site: { id: string; name: string } | null
  people: Person[]
}

type Data = {
  groups: Group[]
  total: number
  asOf: string
  scope: 'team' | 'company'
}

function fmtAsOf(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ManagerPresencePage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<'team' | 'company'>('team')
  const [filterSite, setFilterSite] = useState<string>('__all__')

  const load = useCallback(async (s: 'team' | 'company') => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/manager/presence?scope=${s}`)
    if (res.ok) {
      setData(await res.json())
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Erreur de chargement')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load(scope)
    const interval = setInterval(() => load(scope), 60_000)
    return () => clearInterval(interval)
  }, [load, scope])

  const handleScope = (s: 'team' | 'company') => {
    setScope(s)
    setFilterSite('__all__')
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <Card>
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-[var(--pp-ink)] font-medium">Accès non disponible</p>
            <p className="text-[var(--pp-muted)] text-sm mt-1">{error}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Présences en cours</h1>
          <p className="text-[var(--pp-muted)] text-sm mt-1">
            Personnes actuellement pointées — mise à jour toutes les 60 s
          </p>
        </div>
        {data && (
          <span className="text-xs text-[var(--pp-muted)]">
            Actualisé à {fmtAsOf(data.asOf)}
          </span>
        )}
      </div>

      {/* Scope toggle */}
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => handleScope('team')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
            scope === 'team'
              ? 'bg-[var(--pp-info)] text-white border-[var(--pp-info)]'
              : 'border-[var(--pp-line)] text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
          }`}
        >
          Mon équipe
        </button>
        <button
          onClick={() => handleScope('company')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
            scope === 'company'
              ? 'bg-[var(--pp-info)] text-white border-[var(--pp-info)]'
              : 'border-[var(--pp-line)] text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
          }`}
        >
          Toute la compagnie
        </button>
      </div>

      {loading ? (
        <p className="text-[var(--pp-muted)] text-sm">Chargement…</p>
      ) : !data || data.total === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-[var(--pp-ink)] font-medium">Aucune présence en cours</p>
            <p className="text-[var(--pp-muted)] text-sm mt-1">
              {scope === 'team' ? 'Personne de votre équipe n\'est actuellement pointé.' : 'Personne n\'est actuellement pointé.'}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/30">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--pp-pos)] animate-pulse" />
            <span className="text-sm font-semibold text-[var(--pp-pos)]">
              {data.total} personne{data.total > 1 ? 's' : ''} présente{data.total > 1 ? 's' : ''}
            </span>
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
            {data.groups
              .filter(g => filterSite === '__all__' || (g.site?.id ?? '__none__') === filterSite)
              .map((group, idx) => (
                <Card key={idx}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--pp-info)]/10 flex items-center justify-center text-lg">
                        🏢
                      </div>
                      <h2 className="font-semibold text-[var(--pp-ink)]">
                        {group.site?.name ?? 'Site non renseigné'}
                      </h2>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[var(--pp-pos)]/10 text-[var(--pp-pos)] text-sm font-bold">
                      {group.people.length}
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--pp-line)]">
                    {group.people.map((p, pi) => (
                      <div key={pi} className="flex items-center gap-3 py-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--pp-info)]/10 flex items-center justify-center text-xs font-bold text-[var(--pp-info)] shrink-0">
                          {(p.user.name || p.user.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--pp-ink)] truncate">
                            {p.user.name || p.user.email.split('@')[0]}
                          </p>
                          {p.location && (
                            <p className="text-xs text-[var(--pp-muted)] truncate">{p.location}</p>
                          )}
                        </div>
                        <span className="flex items-center gap-1.5 text-xs text-[var(--pp-pos)] font-medium shrink-0">
                          <span className="w-2 h-2 rounded-full bg-[var(--pp-pos)]" />
                          Présent
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
