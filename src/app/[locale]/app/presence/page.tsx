'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card } from '@/components/Card'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

type Group = {
  site: { id: string; name: string } | null
  people: { name: string; onBreak: boolean }[]
}

type Data = {
  groups: Group[]
  total: number
  asOf: string
}

function fmtAsOf(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function EmployeePresencePage() {
  const t = useTranslations('presence')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterSite, setFilterSite] = useState<string>('__all__')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/app/presence')
    if (res.ok) {
      setData(await res.json())
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? t('loadError'))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <Card>
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-[var(--pp-ink)] font-medium">{t('accessDenied')}</p>
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
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
          <p className="text-[var(--pp-muted)] text-sm mt-1">{t('subtitle')}</p>
        </div>
        {data && (
          <span className="text-xs text-[var(--pp-muted)]">
            {t('refreshedAt', { time: fmtAsOf(data.asOf, bcp) })}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-[var(--pp-muted)] text-sm">{t('loading')}</p>
      ) : !data || data.total === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-[var(--pp-ink)] font-medium">{t('noPresence')}</p>
            <p className="text-[var(--pp-muted)] text-sm mt-1">{t('noPresenceHint')}</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/30">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--pp-pos)] animate-pulse" />
            <span className="text-sm font-semibold text-[var(--pp-pos)]">
              {t('present', { count: data.total })}
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
                {t('allLabel')} ({data.total})
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
                    {g.site?.name ?? t('noSite')} ({g.people.length})
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
                        {group.site?.name ?? t('siteNotSet')}
                      </h2>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[var(--pp-pos)]/10 text-[var(--pp-pos)] text-sm font-bold">
                      {group.people.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {group.people.map((p, pi) => (
                      <div
                        key={pi}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${p.onBreak ? 'bg-amber-50 border-amber-200' : 'bg-[var(--pp-bg2)] border-[var(--pp-line)]'}`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${p.onBreak ? 'bg-amber-400' : 'bg-[var(--pp-pos)]'}`} />
                        <span className="text-sm font-medium text-[var(--pp-ink)]">{p.name}</span>
                        {p.onBreak && <span className="text-xs text-amber-500">{t('onBreak')}</span>}
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
