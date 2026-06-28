'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

function formatWeekLabel(monday: Date, locale: string): string {
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' }
  return `${monday.toLocaleDateString(locale, opts)} – ${sunday.toLocaleDateString(locale, opts)} ${sunday.getUTCFullYear()}`
}

interface PlanningViewProps {
  apiBase: '/api/admin' | '/api/manager'
}

type ModalState =
  | { open: false }
  | { open: true; mode: 'create'; userId: string; date: string; startTime?: string; endTime?: string }
  | { open: true; mode: 'edit'; shift: ShiftData }

export function PlanningView({ apiBase }: PlanningViewProps) {
  const t = useTranslations('planning')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
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
      showToast(t('toastLoadError'), 'error')
    } finally {
      setLoading(false)
    }
  }, [apiBase, t])

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
      throw new Error(json.error ?? t('errorGeneric'))
    }
    showToast(t('toastShiftCreated'), 'success')
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
        throw new Error(json.error ?? t('errorGeneric'))
      }
      showToast(t('toastShiftUpdated'), 'success')
      await fetchData(weekStart)
    }
  }

  const handleDelete = async () => {
    if (modal.open && modal.mode === 'edit') {
      const res = await fetch(`${apiBase}/shifts/${modal.shift.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('errorDelete'))
      showToast(t('toastShiftDeleted'), 'success')
      await fetchData(weekStart)
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-0.5">{t('subtitle')}</p>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={prevWeek}
          className="p-2 rounded-lg border border-[var(--pp-line)] hover:bg-[var(--pp-bg2)] transition text-[var(--pp-ink)]"
          title={t('prevWeek')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-[var(--pp-ink)]">
            {t('weekOf', { range: formatWeekLabel(weekStart, bcp) })}
          </span>
        </div>

        <button
          onClick={nextWeek}
          className="p-2 rounded-lg border border-[var(--pp-line)] hover:bg-[var(--pp-bg2)] transition text-[var(--pp-ink)]"
          title={t('nextWeek')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <button
          onClick={goToCurrentWeek}
          className="px-3 py-1.5 text-xs border border-[var(--pp-line)] rounded-lg hover:bg-[var(--pp-bg2)] transition text-[var(--pp-muted)]"
        >
          {t('today')}
        </button>
      </div>

      {/* Grid */}
      <div className="bg-[var(--pp-bg)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-[var(--pp-muted)]">{t('loading')}</div>
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
          {t('legDay')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="inline-block w-3 h-4 rounded-l bg-emerald-500/15 border border-emerald-500/35" />
            <span className="inline-block w-3 h-4 rounded-r bg-emerald-500/8 border border-dashed border-emerald-400/60" />
          </span>
          {t('legMorning')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="inline-block w-3 h-4 rounded-l bg-amber-500/15 border border-amber-500/35" />
            <span className="inline-block w-3 h-4 rounded-r bg-amber-500/8 border border-dashed border-amber-400/60" />
          </span>
          {t('legAfternoon')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="inline-block w-3 h-4 rounded-l bg-indigo-500/15 border border-indigo-500/35" />
            <span className="inline-block w-3 h-4 rounded-r bg-indigo-500/8 border border-dashed border-indigo-400/60" />
          </span>
          {t('legNight')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="inline-block w-3 h-4 rounded-l bg-violet-500/15 border border-violet-500/35" />
            <span className="inline-block w-3 h-4 rounded-r bg-violet-500/8 border border-dashed border-violet-400/60" />
          </span>
          {t('legPartial')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="inline-block w-3 h-4 rounded-l bg-teal-500/15 border border-teal-500/35" />
            <span className="inline-block w-3 h-4 rounded-r bg-teal-500/8 border border-dashed border-teal-400/60" />
          </span>
          {t('legVariable')}
        </span>
        <span className="text-[var(--pp-muted)]/50 hidden sm:inline">·</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-4 rounded bg-sky-500/15 border border-sky-500/35" />
          <span className="text-[var(--pp-muted)]/70">{t('legConfirmed')}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-4 rounded bg-sky-500/8 border border-dashed border-sky-400/60" />
          <span className="text-[var(--pp-muted)]/70">{t('legToConfirm')}</span>
        </span>
        <span className="text-[var(--pp-muted)]/50 hidden sm:inline">·</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-amber-500/10 border border-dashed border-amber-400/50" />
          {t('legRecovery')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/25" />
          {t('legAnnual')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-orange-500/10 border border-orange-500/25" />
          {t('legSick')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-pink-500/10 border border-pink-500/25" />
          {t('legMaternity')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded border border-dashed border-[var(--pp-line)]" />
          {t('legCreate')}
        </span>
        <span className="text-[var(--pp-muted)]/50 hidden sm:inline">·</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-cyan-500/8 border border-dashed border-cyan-400/60" />
          {t('legRemote')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-orange-500/8 border border-dashed border-orange-400/60" />
          {t('legHalf')}
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
