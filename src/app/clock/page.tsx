'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

interface ClockRecord {
  date: string
  day: string
  hours: number
}

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

export default function ClockPage() {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState('Sur site')
  const [dailyHours, setDailyHours] = useState(0)
  const [weeklyRecords, setWeeklyRecords] = useState<ClockRecord[]>([
    { date: 'Mon', day: 'Lun', hours: 8.5 },
    { date: 'Tue', day: 'Mar', hours: 9 },
    { date: 'Wed', day: 'Mer', hours: 8 },
    { date: 'Thu', day: 'Jeu', hours: 0 },
    { date: 'Fri', day: 'Ven', hours: 0 },
  ])
  const [notification, setNotification] = useState('')

  // Update current time every second
  useEffect(() => {
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-BE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).replace(/^\w/, c => c.toUpperCase())
  }

  const handleClockToggle = () => {
    const action = isClockedIn ? 'DÉPART' : 'ARRIVÉE'
    setIsClockedIn(!isClockedIn)
    setNotification(`Pointage ${action} enregistré ✓`)
    setDailyHours(prev => prev + 0.5) // Simplified: add 30 min per click
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      {/* Header */}
      <header className="sticky top-0 border-b border-[var(--pp-line)] bg-[var(--pp-bg)]/95 backdrop-blur py-4">
        <div className="max-w-sm mx-auto px-4 flex items-center justify-between">
          <div className="text-xl font-bold text-[var(--pp-ink)]">PoinçOn</div>
          <button className="text-[var(--pp-muted)] hover:text-[var(--pp-ink)]">⚙️</button>
        </div>
      </header>

      {/* Main Clock Section */}
      <div className="max-w-sm mx-auto px-4 pt-8">
        {/* Current Time */}
        <div className="text-center mb-8">
          <div className="text-6xl font-bold font-mono text-[var(--pp-ink)] mb-2">
            {formatTime(currentTime)}
          </div>
          <div className="text-lg text-[var(--pp-muted)] capitalize">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)] text-[var(--pp-pos)] text-center font-medium animate-in fade-in">
            {notification}
          </div>
        )}

        {/* Location Selector */}
        <div className="mb-8">
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

        {/* Big Clock Button */}
        <div className="mb-8">
          <Button
            onClick={handleClockToggle}
            className="w-full h-40 text-2xl font-bold"
            variant={isClockedIn ? 'primary' : 'primary'}
            size="lg"
            style={{
              backgroundColor: isClockedIn ? 'var(--pp-neg)' : 'var(--pp-pos)',
            }}
          >
            {isClockedIn ? 'DÉPART' : 'ARRIVÉE'}
          </Button>
        </div>

        {/* Daily Summary */}
        <Card className="mb-8">
          <h3 className="text-sm font-medium text-[var(--pp-muted)] mb-2">
            Pointé aujourd'hui
          </h3>
          <div className="text-3xl font-bold text-[var(--pp-ink)]">
            {dailyHours}h{String((dailyHours % 1) * 60).padStart(2, '0')}
          </div>
          <p className="text-xs text-[var(--pp-muted)] mt-2">
            Localisation: {location}
          </p>
        </Card>

        {/* Weekly History */}
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
      </div>
    </div>
  )
}
