'use client'

import { ShiftCell } from './ShiftCell'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getMondayOf(weekStart: Date): Date {
  return new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate()))
}

export interface ShiftData {
  id: string
  userId: string
  date: string // ISO string
  startTime: string
  endTime: string
  note?: string | null
}

export interface UserData {
  id: string
  name: string | null
  email: string
}

export interface TimeOffData {
  userId: string
  startDate: string
  endDate: string
}

interface WeekGridProps {
  weekStart: Date
  shifts: ShiftData[]
  users: UserData[]
  timeOffs: TimeOffData[]
  onCellClick: (userId: string, date: string) => void
  onShiftClick: (shift: ShiftData) => void
}

export function WeekGrid({ weekStart, shifts, users, timeOffs, onCellClick, onShiftClick }: WeekGridProps) {
  const monday = getMondayOf(weekStart)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  // Build lookup: userId+dateKey → shift
  const shiftMap = new Map<string, ShiftData>()
  for (const s of shifts) {
    const k = dateKey(new Date(s.date))
    shiftMap.set(`${s.userId}__${k}`, s)
  }

  // Build lookup: userId+dateKey → boolean (has approved time off)
  const timeOffSet = new Set<string>()
  for (const t of timeOffs) {
    const start = new Date(t.startDate)
    const end = new Date(t.endDate)
    for (const day of days) {
      const dk = dateKey(day)
      if (day >= start && day <= end) {
        timeOffSet.add(`${t.userId}__${dk}`)
      }
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--pp-muted)] text-sm">
        Aucun employé dans cette vue.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[700px]">
        <thead>
          <tr>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--pp-muted)] border-b border-[var(--pp-line)] w-36 sticky left-0 bg-[var(--pp-bg2)] z-10">
              Employé
            </th>
            {days.map((day, i) => {
              const isWeekend = i >= 5
              return (
                <th
                  key={i}
                  className={`text-center px-2 py-2.5 text-xs font-semibold border-b border-[var(--pp-line)] min-w-[110px] ${isWeekend ? 'text-[var(--pp-muted)]/60' : 'text-[var(--pp-muted)]'}`}
                >
                  <span className="block">{DAY_LABELS[i]}</span>
                  <span className={`block text-sm font-bold mt-0.5 ${isWeekend ? 'text-[var(--pp-muted)]/60' : 'text-[var(--pp-ink)]'}`}>
                    {day.getUTCDate()}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--pp-line)]">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-[var(--pp-bg2)]/50 transition-colors">
              <td className="px-3 py-2 sticky left-0 bg-[var(--pp-bg)] z-10 border-r border-[var(--pp-line)]">
                <div className="text-xs font-medium text-[var(--pp-ink)] truncate max-w-[128px]">
                  {user.name ?? user.email}
                </div>
                {user.name && (
                  <div className="text-[10px] text-[var(--pp-muted)] truncate max-w-[128px]">{user.email}</div>
                )}
              </td>
              {days.map((day, i) => {
                const dk = dateKey(day)
                const key = `${user.id}__${dk}`
                const shift = shiftMap.get(key)
                const isTimeOff = timeOffSet.has(key)
                const isWeekend = i >= 5

                return (
                  <td
                    key={i}
                    className={`px-1.5 py-1.5 ${isWeekend ? 'bg-[var(--pp-line)]/10' : ''}`}
                  >
                    <ShiftCell
                      shift={shift}
                      isTimeOff={isTimeOff && !shift}
                      onClick={() => {
                        if (shift) {
                          onShiftClick(shift)
                        } else if (!isTimeOff) {
                          onCellClick(user.id, dk)
                        }
                      }}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
