'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { MonthlyCalendar } from '@/components/MonthlyCalendar'
import { BalanceWidget } from '@/components/BalanceWidget'

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

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

export default function ClockPage() {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [location, setLocation] = useState('Sur site')
  const [dailyHours, setDailyHours] = useState(0)
  const [arrivalTime, setArrivalTime] = useState<string | null>(null)
  const [departureTime, setDepartureTime] = useState<string | null>(null)
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ClockRecord[]>([])
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklyRecord[]>([
    { date: 'Mon', day: 'Lun', hours: 8.5 },
    { date: 'Tue', day: 'Mar', hours: 9 },
    { date: 'Wed', day: 'Mer', hours: 8 },
    { date: 'Thu', day: 'Jeu', hours: 0 },
    { date: 'Fri', day: 'Ven', hours: 0 },
  ])
  const [notification, setNotification] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')

  // Load clock records for today
  useEffect(() => {
    const loadTodayRecords = async () => {
      try {
        const res = await fetch('/api/clock/record')
        if (res.ok) {
          const records = await res.json()
          setSessions(records)

          // Calculate daily hours and set state based on last record
          let totalHours = 0
          let currentlyClocked = false
          let lastRecordId = null
          let lastArrival = null
          let lastDeparture = null

          for (const record of records) {
            if (record.departureTime && record.duration) {
              totalHours += record.duration / 60 // duration is in minutes
            }
            if (!record.departureTime) {
              currentlyClocked = true
              lastRecordId = record.id
              lastArrival = new Date(record.arrivalTime).toLocaleTimeString('fr-BE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            } else {
              lastDeparture = new Date(record.departureTime).toLocaleTimeString('fr-BE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            }
          }

          setDailyHours(totalHours)
          setIsClockedIn(currentlyClocked)
          setCurrentRecordId(lastRecordId)
          setArrivalTime(lastArrival)
          setDepartureTime(lastDeparture)
        }
      } catch (error) {
        console.error('Failed to load records:', error)
      }
    }

    loadTodayRecords()
  }, [])

  // Initialize time after hydration
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--'
    return date.toLocaleTimeString('fr-BE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('fr-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).replace(/^\w/, c => c.toUpperCase())
  }

  const handleClockToggle = async () => {
    if (!currentTime || loading) return

    setLoading(true)
    const timeStr = formatTime(currentTime)

    try {
      if (!isClockedIn) {
        // ARRIVÉE
        const res = await fetch('/api/clock/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            arrivalTime: currentTime.toISOString(),
            location,
          }),
        })

        if (!res.ok) {
          setNotification('Erreur lors de l\'enregistrement')
          setLoading(false)
          return
        }

        const record = await res.json()
        setCurrentRecordId(record.id)
        setArrivalTime(timeStr)
        setDepartureTime(null)
        setIsClockedIn(true)
        setNotification(`Arrivée enregistrée à ${timeStr} ✓`)
        setSessions(prev => [...prev, record])
      } else {
        // DÉPART
        if (!currentRecordId || !arrivalTime) {
          setLoading(false)
          return
        }

        const [arrH, arrM, arrS] = arrivalTime.split(':').map(Number)
        const [depH, depM, depS] = timeStr.split(':').map(Number)

        const arrivalMinutes = arrH * 60 + arrM + arrS / 60
        const departureMinutes = depH * 60 + depM + depS / 60
        let durationMinutes = departureMinutes - arrivalMinutes

        if (durationMinutes < 0) {
          durationMinutes += 24 * 60
        }

        const durationHours = durationMinutes / 60

        const res = await fetch('/api/clock/record', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId: currentRecordId,
            departureTime: currentTime.toISOString(),
            duration: durationHours,
          }),
        })

        if (!res.ok) {
          setNotification('Erreur lors de l\'enregistrement du départ')
          setLoading(false)
          return
        }

        const record = await res.json()
        setDepartureTime(timeStr)
        setIsClockedIn(false)
        setDailyHours(prev => prev + durationHours)
        setNotification(`Départ enregistré à ${timeStr} ✓`)
        setCurrentRecordId(null)

        // Update sessions list
        setSessions(prev => prev.map(s => s.id === record.id ? record : s))
      }
    } catch (error) {
      console.error('Clock toggle error:', error)
      setNotification('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20" suppressHydrationWarning>
      {/* Header */}
      <header className="sticky top-0 border-b border-[var(--pp-line)] bg-[var(--pp-bg)]/95 backdrop-blur py-4" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="text-xl font-bold text-[var(--pp-ink)]">PoinçOn</div>
          <button className="text-[var(--pp-muted)] hover:text-[var(--pp-ink)]">⚙️</button>
        </div>
      </header>

      {/* Main Clock Section */}
      <div className="max-w-7xl mx-auto px-4 pt-8" suppressHydrationWarning>
        {/* Grid Layout: Mobile vertical, Tablet 2-col, Desktop 3-col */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" suppressHydrationWarning>

          {/* LEFT COLUMN: History (week or month toggle) */}
          <div className="lg:order-1 order-last space-y-4" suppressHydrationWarning>
            {/* Toggle Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('week')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                  viewMode === 'week'
                    ? 'bg-[var(--pp-info)] text-white'
                    : 'bg-[var(--pp-line)]/30 text-[var(--pp-muted)] hover:bg-[var(--pp-line)]/50'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                  viewMode === 'month'
                    ? 'bg-[var(--pp-info)] text-white'
                    : 'bg-[var(--pp-line)]/30 text-[var(--pp-muted)] hover:bg-[var(--pp-line)]/50'
                }`}
              >
                Mois
              </button>
            </div>

            {/* Weekly View */}
            {viewMode === 'week' && (
              <Card>
                <h3 className="text-sm font-bold text-[var(--pp-ink)] mb-4">
                  Historique semaine
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {weeklyRecords.map((record, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-xs text-[var(--pp-muted)] mb-2">
                        {record.day}
                      </div>
                      <div className="h-20 bg-gradient-to-t from-[var(--pp-pos)] to-[var(--pp-info)] rounded-lg opacity-60 mb-2" style={{
                        height: `${Math.max(record.hours * 2, 10)}px`,
                      }} />
                      <div className="text-xs font-medium text-[var(--pp-ink)]">
                        {record.hours === 0 ? '-' : `${record.hours}h`}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Monthly View */}
            {viewMode === 'month' && (
              <MonthlyCalendar />
            )}
          </div>

          {/* CENTER COLUMN: Main Clock (stays in center) */}
          <div className="lg:order-2 order-first space-y-8" suppressHydrationWarning>
            {/* Current Time */}
            <div className="text-center" suppressHydrationWarning>
              <div className="text-6xl font-bold font-mono text-[var(--pp-ink)] mb-2">
                {formatTime(currentTime)}
              </div>
              <div className="text-lg text-[var(--pp-muted)] capitalize">
                {formatDate(currentTime)}
              </div>
            </div>

            {/* Notification Toast */}
            {notification && (
              <div className="p-4 rounded-lg bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)] text-[var(--pp-pos)] text-center font-medium animate-in fade-in">
                {notification}
              </div>
            )}

            {/* Location Selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-3">
                Localisation
              </label>
              <select
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              >
                <option>Sur site</option>
                <option>Télétravail</option>
                <option>Déplacement</option>
              </select>
            </div>

            {/* Times Display */}
            {(arrivalTime || departureTime) && (
              <Card>
                <div className="grid grid-cols-2 gap-4">
                  {arrivalTime && (
                    <div>
                      <p className="text-xs text-[var(--pp-muted)] mb-1">Arrivée</p>
                      <p className="text-xl font-bold text-[var(--pp-pos)]">{arrivalTime}</p>
                    </div>
                  )}
                  {departureTime && (
                    <div>
                      <p className="text-xs text-[var(--pp-muted)] mb-1">Départ</p>
                      <p className="text-xl font-bold text-[var(--pp-neg)]">{departureTime}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Big Clock Button */}
            <Button
              onClick={handleClockToggle}
              disabled={loading}
              className="w-full h-40 text-2xl font-bold"
              variant={isClockedIn ? 'primary' : 'primary'}
              size="lg"
              style={{
                backgroundColor: isClockedIn ? 'var(--pp-neg)' : 'var(--pp-pos)',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Traitement...' : isClockedIn ? 'DÉPART' : 'ARRIVÉE'}
            </Button>
          </div>

          {/* RIGHT COLUMN: Daily Summary + Sessions (appears on right on desktop, bottom on mobile) */}
          <div className="lg:order-3 order-last space-y-8" suppressHydrationWarning>
            {/* Balance Widget */}
            <BalanceWidget />

            {/* Daily Summary */}
            <Card>
              <h3 className="text-sm font-medium text-[var(--pp-muted)] mb-2">
                Pointé aujourd'hui
              </h3>
              <div className="text-3xl font-bold text-[var(--pp-ink)]">
                {Math.floor(dailyHours)}h{String(Math.round((dailyHours % 1) * 60)).padStart(2, '0')}m
              </div>
              <p className="text-xs text-[var(--pp-muted)] mt-2">
                Localisation: {location}
              </p>
            </Card>

            {/* Sessions Today */}
            {sessions.length > 0 && (
              <Card>
                <h3 className="text-sm font-bold text-[var(--pp-ink)] mb-4">
                  Séances du jour
                </h3>
                <div className="space-y-3">
                  {sessions.map((session, idx) => {
                    const arrivalTime = new Date(session.arrivalTime).toLocaleTimeString('fr-BE', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                    const departureTime = session.departureTime
                      ? new Date(session.departureTime).toLocaleTimeString('fr-BE', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'En cours...'
                    const durationMinutes = session.duration || 0

                    return (
                      <div key={session.id} className="flex justify-between items-center pb-3 border-b border-[var(--pp-line)] last:border-b-0">
                        <div>
                          <p className="text-xs text-[var(--pp-muted)]">Séance {idx + 1}</p>
                          <p className="text-sm font-medium text-[var(--pp-ink)]">
                            {arrivalTime} → {departureTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[var(--pp-muted)]">Durée</p>
                          <p className="text-sm font-bold text-[var(--pp-pos)]">
                            {Math.floor(durationMinutes)}m {Math.round((durationMinutes % 1) * 60)}s
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
