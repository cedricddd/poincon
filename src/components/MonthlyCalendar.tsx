'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'

interface MonthlyCalendarProps {
  initialYear?: number
  initialMonth?: number
}

export function MonthlyCalendar({ initialYear, initialMonth }: MonthlyCalendarProps) {
  const now = new Date()
  const [year, setYear] = useState(initialYear || now.getFullYear())
  const [month, setMonth] = useState(initialMonth || now.getMonth() + 1)
  const [dailyHours, setDailyHours] = useState<Record<string, number>>({})
  const [totalHours, setTotalHours] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMonthlyData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/clock/monthly?year=${year}&month=${month}`)
        if (res.ok) {
          const data = await res.json()
          setDailyHours(data.dailyHours)
          setTotalHours(data.totalHours)
        }
      } catch (error) {
        console.error('Failed to load monthly data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMonthlyData()
  }, [year, month])

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m - 1, 1).getDay()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, () => null)

  const monthName = new Date(year, month - 1).toLocaleDateString('fr-BE', {
    month: 'long',
    year: 'numeric',
  })

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const getHourColor = (hours: number) => {
    if (!hours) return 'bg-[var(--pp-line)]/30'
    if (hours >= 8) return 'bg-[var(--pp-pos)]/20 text-[var(--pp-pos)]'
    if (hours >= 4) return 'bg-[var(--pp-info)]/20 text-[var(--pp-info)]'
    return 'bg-[var(--pp-neg)]/10 text-[var(--pp-neg)]'
  }

  const getDateKey = (day: number) => {
    const d = new Date(year, month - 1, day)
    return d.toISOString().split('T')[0]
  }

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <Card className="w-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--pp-ink)]">
            Calendrier {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </h3>
          <div className="text-sm font-medium text-[var(--pp-ink)]">
            {Math.floor(totalHours)}h{String(Math.round((totalHours % 1) * 60)).padStart(2, '0')}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={prevMonth}
            className="px-3 py-1 text-sm font-medium text-[var(--pp-info)] hover:bg-[var(--pp-info)]/10 rounded transition"
          >
            ← Prev
          </button>
          <span className="text-xs text-[var(--pp-muted)] capitalize text-center flex-1">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="px-3 py-1 text-sm font-medium text-[var(--pp-info)] hover:bg-[var(--pp-info)]/10 rounded transition"
          >
            Next →
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {dayNames.map(day => (
            <div key={day} className="text-xs font-medium text-[var(--pp-muted)] text-center py-2">
              {day}
            </div>
          ))}

          {/* Empty days before month starts */}
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Days of month */}
          {days.map(day => {
            const dateKey = getDateKey(day)
            const hours = dailyHours[dateKey] || 0

            return (
              <div
                key={day}
                className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-center text-xs font-medium transition ${getHourColor(hours)}`}
              >
                <div className="text-[var(--pp-muted)]">{day}</div>
                {hours > 0 && (
                  <div className="text-xs font-bold">
                    {Math.floor(hours)}h{String(Math.round((hours % 1) * 60)).padStart(2, '0')}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="pt-2 border-t border-[var(--pp-line)] grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[var(--pp-pos)]/20" />
            <span className="text-[var(--pp-muted)]">&ge; 8h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[var(--pp-info)]/20" />
            <span className="text-[var(--pp-muted)]">4-8h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[var(--pp-neg)]/10" />
            <span className="text-[var(--pp-muted)]">&lt; 4h</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
