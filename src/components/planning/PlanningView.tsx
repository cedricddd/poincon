'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { showToast } from '@/hooks/useToast'
import { WeekGrid, ShiftData, UserData, TimeOffData, RTTData } from './WeekGrid'
import { ShiftModal, ShiftFormData } from './ShiftModal'
import { getCurrentPeriod, parseWorkDays } from '@/lib/rotation'

interface RotationPeriod { id: string; order: number; label: string; shiftType: string | null; startTime: string | null; endTime: string | null; workDays: string }
interface RotationCycle { id: string; name: string; periodUnit: 'WEEK' | 'DAY'; anchorDate: string; periods: RotationPeriod[] }
interface TeamWithRotation { id: string; members: { userId: string }[]; rotationCycle: RotationCycle | null; rotationPhase: number | null }

function getMonday(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  return date
}

function dateKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' }
  return `${monday.toLocaleDateString('fr-BE', opts)} – ${sunday.toLocaleDateString('fr-BE', opts)} ${sunday.getUTCFullYear()}`
}

interface PlanningViewProps {
  apiBase: '/api/admin' | '/api/manager'
}

type ModalState =
  | { open: false }
  | { open: true; mode: 'create'; userId: string; date: string; startTime?: string; endTime?: string }
  | { open: true; mode: 'edit'; shift: ShiftData }

export function PlanningView({ apiBase }: PlanningViewProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [timeOffs, setTimeOffs] = useState<TimeOffData[]>([])
  const [rtts, setRtts] = useState<RTTData[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [teams, setTeams] = useState<TeamWithRotation[]>([])

  const fetchData = useCallback(async (monday: Date) => {
    setLoading(true)
    try {
      const wk = dateKey(monday)
      const res = await fetch(`${apiBase}/shifts?weekStart=${wk}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setShifts(data.shifts ?? [])
      setUsers(data.users ?? [])
      setTimeOffs(data.timeOffs ?? [])
      setRtts(data.rtts ?? [])
    } catch {
      showToast('Erreur lors du chargement du planning', 'error')
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => { fetchData(weekStart) }, [weekStart, fetchData])

  useEffect(() => {
    if (apiBase !== '/api/admin') return
    fetch('/api/admin/teams')
      .then(r => r.ok ? r.json() : { teams: [] })
      .then(d => setTeams(d.teams ?? []))
      .catch(() => {})
  }, [apiBase])

  const { userPhaseBadges, userRotationSlots } = useMemo((): {
    userPhaseBadges: Map<string, string>
    userRotationSlots: Map<string, { startTime: string; endTime: string; shiftType: string | null }>
  } => {
    const badges = new Map<string, string>()
    const slots = new Map<string, { startTime: string; endTime: string; shiftType: string | null }>()
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
    for (const team of teams) {
      if (!team.rotationCycle || team.rotationPhase == null) continue
      const cycle = team.rotationCycle
      const teamData = {
        id: team.id,
        rotationCycle: {
          ...cycle,
          anchorDate: new Date(cycle.anchorDate),
          periods: cycle.periods.map(p => ({ ...p, workDays: parseWorkDays(p.workDays) })),
        },
        rotationPhase: team.rotationPhase,
      }
      // Badge for the week (uses weekStart = Monday)
      const weekPeriod = getCurrentPeriod(teamData, weekStart)
      if (weekPeriod) {
        for (const m of team.members) badges.set(m.userId, weekPeriod.label)
      }
      // Per-day ghost slots
      for (const day of days) {
        const period = getCurrentPeriod(teamData, day)
        if (!period || !period.startTime || !period.endTime) continue
        const dow = day.getDay() === 0 ? 7 : day.getDay()
        if (!period.workDays.includes(dow)) continue
        const dk = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
        for (const m of team.members) {
          slots.set(`${m.userId}__${dk}`, { startTime: period.startTime, endTime: period.endTime, shiftType: period.shiftType })
        }
      }
    }
    return { userPhaseBadges: badges, userRotationSlots: slots }
  }, [teams, weekStart])

  const prevWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev)
      d.setUTCDate(d.getUTCDate() - 7)
      return d
    })
  }

  const nextWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev)
      d.setUTCDate(d.getUTCDate() + 7)
      return d
    })
  }

  const goToCurrentWeek = () => setWeekStart(getMonday(new Date()))

  const handleCreate = async (data: ShiftFormData) => {
    const res = await fetch(`${apiBase}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error ?? 'Erreur')
    }
    showToast('Shift créé', 'success')
    await fetchData(weekStart)
  }

  const handleEdit = async (data: ShiftFormData) => {
    if (modal.open && modal.mode === 'edit') {
      const res = await fetch(`${apiBase}/shifts/${modal.shift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Erreur')
      }
      showToast('Shift modifié', 'success')
      await fetchData(weekStart)
    }
  }

  const handleDelete = async () => {
    if (modal.open && modal.mode === 'edit') {
      const res = await fetch(`${apiBase}/shifts/${modal.shift.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression')
      showToast('Shift supprimé', 'success')
      await fetchData(weekStart)
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Planning des shifts</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-0.5">Vue hebdomadaire — cliquez sur une cellule pour créer ou modifier un shift.</p>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={prevWeek}
          className="p-2 rounded-lg border border-[var(--pp-line)] hover:bg-[var(--pp-bg2)] transition text-[var(--pp-ink)]"
          title="Semaine précédente"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-[var(--pp-ink)]">
            Semaine du {formatWeekLabel(weekStart)}
          </span>
        </div>

        <button
          onClick={nextWeek}
          className="p-2 rounded-lg border border-[var(--pp-line)] hover:bg-[var(--pp-bg2)] transition text-[var(--pp-ink)]"
          title="Semaine suivante"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <button
          onClick={goToCurrentWeek}
          className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg hover:bg-[var(--pp-bg2)] transition text-[var(--pp-muted)]"
        >
          Aujourd'hui
        </button>
      </div>

      {/* Grid */}
      <div className="bg-[var(--pp-bg)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-[var(--pp-muted)]">Chargement...</div>
        ) : (
          <WeekGrid
            weekStart={weekStart}
            shifts={shifts}
            users={users}
            timeOffs={timeOffs}
            rtts={rtts}
            userPhaseBadges={userPhaseBadges}
            userRotationSlots={userRotationSlots}
            onCellClick={(userId, date, prefill) => setModal({ open: true, mode: 'create', userId, date, startTime: prefill?.startTime, endTime: prefill?.endTime })}
            onShiftClick={shift => setModal({ open: true, mode: 'edit', shift })}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--pp-muted)]">
        {/* Shift types — solid = confirmé, pointillé = horaire à confirmer */}
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="inline-block w-3 h-4 rounded-l bg-sky-500/15 border border-sky-500/35" />
            <span className="inline-block w-3 h-4 rounded-r bg-sky-500/8 border border-dashed border-sky-400/60" />
          </span>
          Journée
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="inline-block w-3 h-4 rounded-l bg-emerald-500/15 border border-emerald-500/35" />
            <span className="inline-block w-3 h-4 rounded-r bg-emerald-500/8 border border-dashed border-emerald-400/60" />
          </span>
          Matin (2×8)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="inline-block w-3 h-4 rounded-l bg-amber-500/15 border border-amber-500/35" />
            <span className="inline-block w-3 h-4 rounded-r bg-amber-500/8 border border-dashed border-amber-400/60" />
          </span>
          Après-midi (2×8)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="inline-block w-3 h-4 rounded-l bg-indigo-500/15 border border-indigo-500/35" />
            <span className="inline-block w-3 h-4 rounded-r bg-indigo-500/8 border border-dashed border-indigo-400/60" />
          </span>
          Nuit (3×8)
        </span>
        <span className="text-[var(--pp-muted)]/50 hidden sm:inline">·</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-4 rounded bg-sky-500/15 border border-sky-500/35" />
          <span className="text-[var(--pp-muted)]/70">= confirmé</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-4 rounded bg-sky-500/8 border border-dashed border-sky-400/60" />
          <span className="text-[var(--pp-muted)]/70">= à confirmer</span>
        </span>
        <span className="text-[var(--pp-muted)]/50 hidden sm:inline">·</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-amber-500/10 border border-dashed border-amber-400/50" />
          Récupération
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/25" />
          Congé annuel
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-orange-500/10 border border-orange-500/25" />
          Congé maladie
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-pink-500/10 border border-pink-500/25" />
          Congé maternité
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded border border-dashed border-[var(--pp-line)]" />
          Créer
        </span>
      </div>

      {/* Modal */}
      {modal.open && modal.mode === 'create' && (
        <ShiftModal
          mode="create"
          initialData={{ userId: modal.userId, date: modal.date, startTime: modal.startTime, endTime: modal.endTime }}
          users={users}
          onSave={handleCreate}
          onClose={() => setModal({ open: false })}
        />
      )}
      {modal.open && modal.mode === 'edit' && (
        <ShiftModal
          mode="edit"
          initialData={{}}
          users={users}
          shift={modal.shift}
          onSave={handleEdit}
          onDelete={handleDelete}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  )
}
