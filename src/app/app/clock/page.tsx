'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { MonthlyCalendar } from '@/components/MonthlyCalendar'
import { BalanceWidget } from '@/components/BalanceWidget'
import { showToast } from '@/hooks/useToast'
import { useOfflineSync } from '@/hooks/useOfflineSync'

interface ClockRecord {
  id: string
  userId: string
  arrivalTime: string
  departureTime: string | null
  location: string
  duration: number | null
  date: string
  createdAt: string
}

interface WeeklyRecord {
  date: string
  day: string
  hours: number
}

interface Site {
  id: string
  name: string
}

export default function ClockPage() {
  const { data: session } = useSession()
  const { savePendingAction, getPendingActions } = useOfflineSync()
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [location, setLocation] = useState('Sur site')
  const [dailyHours, setDailyHours] = useState(0)
  const [arrivalTime, setArrivalTime] = useState<string | null>(null)
  const [departureTime, setDepartureTime] = useState<string | null>(null)
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null)
  const [clockedInAt, setClockedInAt] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState('')
  const [sessions, setSessions] = useState<ClockRecord[]>([])
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklyRecord[]>([
    { date: 'Mon', day: 'Lun', hours: 8.5 },
    { date: 'Tue', day: 'Mar', hours: 9 },
    { date: 'Wed', day: 'Mer', hours: 8 },
    { date: 'Thu', day: 'Jeu', hours: 0 },
    { date: 'Fri', day: 'Ven', hours: 0 },
  ])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')

  // Load pending actions
  useEffect(() => {
    const loadPending = async () => {
      const pending = await getPendingActions()
      setPendingIds(new Set(pending.map(p => {
        const dataStr = JSON.stringify(p.data)
        return dataStr.includes('arrivalTime') ? `arrival-${p.timestamp}` : `departure-${p.timestamp}`
      })))
    }
    loadPending()
    const interval = setInterval(loadPending, 1000)
    return () => clearInterval(interval)
  }, [getPendingActions])

  // Load sites
  useEffect(() => {
    fetch('/api/user/sites')
      .then(r => r.json())
      .then(({ sites, defaultSiteId }) => {
        setSites(sites)
        setSelectedSiteId(defaultSiteId ?? '')
      })
      .catch(() => {})
  }, [])

  // Load clock records for today
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/clock/record')
        if (!res.ok) return
        const records: ClockRecord[] = await res.json()
        setSessions(records)

        let totalHours = 0
        let currentlyClocked = false
        let lastRecordId = null
        let lastArrival = null
        let lastArrivalDate: Date | null = null
        let lastDeparture = null

        for (const record of records) {
          if (record.departureTime && record.duration) {
            totalHours += record.duration / 60
          }
          if (!record.departureTime) {
            currentlyClocked = true
            lastRecordId = record.id
            lastArrivalDate = new Date(record.arrivalTime)
            lastArrival = lastArrivalDate.toLocaleTimeString('fr-BE', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })
          } else {
            lastDeparture = new Date(record.departureTime).toLocaleTimeString('fr-BE', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })
          }
        }

        setDailyHours(totalHours)
        setIsClockedIn(currentlyClocked)
        setCurrentRecordId(lastRecordId)
        setArrivalTime(lastArrival)
        setDepartureTime(lastDeparture)
        if (currentlyClocked && lastArrivalDate) setClockedInAt(lastArrivalDate)
      } catch (e) {
        console.error('Failed to load records:', e)
      }
    }
    load()
  }, [])

  // Live clock
  useEffect(() => {
    setCurrentTime(new Date())
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Elapsed timer
  useEffect(() => {
    if (!isClockedIn || !clockedInAt) { setElapsed(''); return }
    const update = () => {
      const diff = Math.floor((Date.now() - clockedInAt.getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [isClockedIn, clockedInAt])

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--'
    return date.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })
      .replace(/^\w/, c => c.toUpperCase())
  }

  const greeting = () => {
    const h = currentTime?.getHours() ?? 12
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  const firstName = session?.user?.name?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? ''

  const handleClockToggle = async () => {
    if (!currentTime || loading) return
    setLoading(true)
    const timeStr = formatTime(currentTime)

    try {
      if (!isClockedIn) {
        const payload = {
          arrivalTime: currentTime.toISOString(),
          location,
          ...(selectedSiteId && { siteId: selectedSiteId }),
        }

        // Try sync immediately (timeout 5s), fallback to pending
        try {
          const res = await Promise.race([
            fetch('/api/clock/record', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000)
            ),
          ])

          if ((res as Response).ok) {
            const record = await (res as Response).json()
            setCurrentRecordId(record.id)
            setArrivalTime(timeStr)
            setDepartureTime(null)
            setIsClockedIn(true)
            setClockedInAt(currentTime)
            showToast(`Arrivée enregistrée à ${timeStr} ✓`, 'success')
            setSessions(prev => [...prev, record])
            return
          }
        } catch (err) {
          // Sync failed, save locally
          console.warn('Sync failed, saving locally:', err)
        }

        // Fallback: save locally + retry en background
        await savePendingAction('punch_in', payload)
        setArrivalTime(timeStr)
        setDepartureTime(null)
        setIsClockedIn(true)
        setClockedInAt(currentTime)
        showToast(`Arrivée enregistrée à ${timeStr} (⏳ en attente de sync)`, 'info')
      } else {
        if (!currentRecordId || !arrivalTime) return

        const [arrH, arrM, arrS] = arrivalTime.split(':').map(Number)
        const [depH, depM, depS] = timeStr.split(':').map(Number)
        let duration = (depH * 60 + depM + depS / 60) - (arrH * 60 + arrM + arrS / 60)
        if (duration < 0) duration += 24 * 60

        const payload = {
          recordId: currentRecordId,
          departureTime: currentTime.toISOString(),
          duration: duration / 60,
        }

        // Try sync immediately (timeout 5s)
        try {
          const res = await Promise.race([
            fetch('/api/clock/record', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000)
            ),
          ])

          if ((res as Response).ok) {
            const record = await (res as Response).json()
            setDepartureTime(timeStr)
            setIsClockedIn(false)
            setClockedInAt(null)
            setElapsed('')
            setDailyHours(prev => prev + duration / 60)
            showToast(`Départ enregistré à ${timeStr} ✓`, 'success')
            setCurrentRecordId(null)
            setSessions(prev => prev.map(s => s.id === record.id ? record : s))
            return
          }
        } catch (err) {
          // Sync failed, save locally
          console.warn('Sync failed, saving locally:', err)
        }

        // Fallback: save locally + retry en background
        await savePendingAction('punch_out', payload)
        setDepartureTime(timeStr)
        setIsClockedIn(false)
        setClockedInAt(null)
        setElapsed('')
        setDailyHours(prev => prev + duration / 60)
        showToast(`Départ enregistré à ${timeStr} (⏳ en attente de sync)`, 'info')
        setCurrentRecordId(null)
      }
    } catch {
      showToast('Erreur de connexion', 'error')
    } finally {
      setLoading(false)
    }
  }

  const maxHours = Math.max(...weeklyRecords.map(r => r.hours), 1)

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-24 md:pb-10" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 pt-6 md:pt-8" suppressHydrationWarning>

        {/* Greeting */}
        <div className="mb-6" suppressHydrationWarning>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--pp-ink)]">
            {greeting()}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-[var(--pp-muted)] capitalize mt-0.5 text-sm">{formatDate(currentTime)}</p>
        </div>

        {/* Desktop: 3-col grid | Mobile: single column, logical order */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" suppressHydrationWarning>

          {/* CENTER — Clock (first on mobile) */}
          <div className="lg:order-2 order-1 space-y-4" suppressHydrationWarning>
            {/* Time display */}
            <div className="text-center py-2" suppressHydrationWarning>
              <div className="text-6xl md:text-6xl font-bold font-mono text-[var(--pp-ink)] tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                {formatTime(currentTime)}
              </div>
            </div>

            {/* Elapsed / status */}
            {isClockedIn && elapsed ? (
              <div className="text-center p-4 rounded-2xl bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/20">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--pp-pos)] animate-pulse" />
                  <p className="text-xs font-semibold text-[var(--pp-pos)] uppercase tracking-widest">En cours</p>
                </div>
                <p className="text-3xl font-mono font-bold text-[var(--pp-pos)] tabular-nums">{elapsed}</p>
                <p className="text-xs text-[var(--pp-muted)] mt-1">depuis {arrivalTime}</p>
              </div>
            ) : departureTime ? (
              <Card>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[var(--pp-muted)] mb-1">Arrivée</p>
                    <p className="text-xl font-bold text-[var(--pp-pos)]">{arrivalTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--pp-muted)] mb-1">Départ</p>
                    <p className="text-xl font-bold text-[var(--pp-neg)]">{departureTime}</p>
                  </div>
                </div>
              </Card>
            ) : null}

            {/* Site + Mode side-by-side on mobile */}
            <div className={`grid gap-3 ${sites.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {sites.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--pp-muted)] mb-1.5 uppercase tracking-wider">Site</label>
                  <select
                    value={selectedSiteId}
                    onChange={e => setSelectedSiteId(e.target.value)}
                    disabled={isClockedIn}
                    className="w-full px-3 py-3 border border-[var(--pp-line)] rounded-xl bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] disabled:opacity-50 touch-manipulation"
                  >
                    <option value="">— Aucun —</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-semibold text-[var(--pp-muted)] mb-1.5 uppercase tracking-wider">Mode</label>
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-3 border border-[var(--pp-line)] rounded-xl bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] touch-manipulation"
                >
                  <option>Sur site</option>
                  <option>Télétravail</option>
                  <option>Déplacement</option>
                </select>
              </div>
            </div>

            {/* Main button */}
            <div className={isClockedIn ? 'pp-clock-active rounded-2xl' : ''}>
              <Button
                onClick={handleClockToggle}
                disabled={loading}
                className="w-full h-24 md:h-32 text-2xl md:text-3xl font-bold tracking-wide rounded-2xl touch-manipulation"
                variant="primary"
                style={{
                  backgroundColor: isClockedIn ? 'var(--pp-neg)' : 'var(--pp-pos)',
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: '0.1em',
                  fontSize: 'clamp(1.25rem, 5vw, 1.875rem)',
                }}
              >
                {loading ? '…' : isClockedIn ? 'DÉPART ✕' : 'ARRIVÉE ✓'}
              </Button>
            </div>
          </div>

          {/* RIGHT — Summary (second on mobile) */}
          <div className="lg:order-3 order-2 space-y-4" suppressHydrationWarning>
            <BalanceWidget />

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1">Pointé aujourd'hui</p>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-[var(--pp-ink)]">
                      {Math.floor(dailyHours)}h{String(Math.round((dailyHours % 1) * 60)).padStart(2, '0')}
                    </div>
                    {pendingIds.size > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">
                        ⏳ {pendingIds.size} en attente
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--pp-pos)18', color: 'var(--pp-pos)' }}>
                  {location}
                </span>
              </div>
            </Card>

            {sessions.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--pp-ink)] mb-3">Séances du jour</h3>
                <div className="space-y-3">
                  {sessions.map((session, idx) => {
                    const arr = new Date(session.arrivalTime).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
                    const dep = session.departureTime
                      ? new Date(session.departureTime).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
                      : null
                    const dur = session.duration ?? 0
                    return (
                      <div key={session.id} className="flex justify-between items-center pb-3 border-b border-[var(--pp-line)] last:border-b-0 last:pb-0">
                        <div>
                          <p className="text-xs text-[var(--pp-muted)]">Séance {idx + 1}</p>
                          <p className="text-sm font-medium text-[var(--pp-ink)]">
                            {arr} → {dep ?? <span className="text-[var(--pp-pos)] animate-pulse">En cours</span>}
                          </p>
                        </div>
                        {dep && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[var(--pp-pos)]/10 text-[var(--pp-pos)]">
                            {Math.floor(dur)}h{String(Math.round((dur % 1) * 60)).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* LEFT — History (last on mobile) */}
          <div className="lg:order-1 order-3 space-y-4" suppressHydrationWarning>
            <div className="flex gap-2">
              {(['week', 'month'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition touch-manipulation ${
                    viewMode === mode
                      ? 'bg-[var(--pp-pos)] text-white'
                      : 'bg-[var(--pp-bg2)] text-[var(--pp-muted)] hover:bg-[var(--pp-line)]'
                  }`}
                >
                  {mode === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>

            {viewMode === 'week' && (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--pp-ink)] mb-4">Semaine en cours</h3>
                <div className="flex items-end gap-2 h-24">
                  {weeklyRecords.map((record, idx) => {
                    const pct = record.hours > 0 ? (record.hours / maxHours) * 100 : 0
                    const isToday = idx === new Date().getDay() - 1
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-medium text-[var(--pp-muted)]">
                          {record.hours > 0 ? `${record.hours}h` : ''}
                        </span>
                        <div className="w-full flex items-end" style={{ height: 64 }}>
                          <div
                            className="w-full rounded-md transition-all"
                            style={{
                              height: `${Math.max(pct, record.hours > 0 ? 8 : 2)}%`,
                              background: isToday
                                ? 'var(--pp-pos)'
                                : record.hours > 0
                                  ? 'linear-gradient(to top, var(--pp-pos), var(--pp-info))'
                                  : 'var(--pp-line)',
                              opacity: record.hours > 0 ? 0.85 : 0.3,
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-medium ${isToday ? 'text-[var(--pp-pos)]' : 'text-[var(--pp-muted)]'}`}>
                          {record.day}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {viewMode === 'month' && <MonthlyCalendar />}
          </div>
        </div>
      </div>
    </div>
  )
}
