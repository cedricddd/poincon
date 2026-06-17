'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

type WorkSchedule = {
  id: string
  name: string
  type: string
  startTime: string
  endTime: string
  hoursPerDay: number
  weeklyHours: number
  daysOfWeek: string
  dayConfig?: string | null
  description?: string
  isPreset: boolean
}

type UserRow = {
  userId: string
  user: { id: string; name: string | null; email: string }
  hoursPerDay: number
  scheduleId: string | null
  workSchedule: WorkSchedule | null
}

const TYPE_LABELS: Record<string, string> = {
  JOURNEE: 'Journée',
  '2X8': '2×8',
  '3X8': '3×8',
  '4X8': '4×8',
  '5X8': '5×8',
  '2X12': '2×12',
  NUIT: 'Nuit fixe',
  PARTIEL: 'Temps partiel',
  VARIABLE: 'Variable',
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  JOURNEE: 'Horaire de bureau classique, sans rotation. Ex : 9h-17h, lun-ven.',
  '2X8': 'Discontinu — 2 équipes alternent matin/après-midi. Pas de nuit. Ex : 6h-14h / 14h-22h.',
  '3X8': 'Semi-continu — 3 équipes couvrent 24h en semaine. Week-ends libres. Commun en industrie belge.',
  '4X8': 'Continu — 4 équipes en rotation 24h/7j, week-ends inclus. Moy. 42h/sem. Ex : raffinage, chimie.',
  '5X8': 'Continu 24/7 — 5 équipes, moy. 38h/sem. Secteurs énergie, sidérurgie, pétrochimie.',
  '2X12': 'Quarts de 12h — 2 équipes jour/nuit. Courant en hôpitaux, sécurité, urgences.',
  NUIT: 'Poste de nuit fixe (22h-6h). Compensation légale belge requise (CCT n°49).',
  PARTIEL: 'Temps partiel — heures et jours à définir selon le contrat.',
  VARIABLE: 'Plages fixes avec arrivée flexible. Ex : plage fixe 9h-15h, flexible 7h-9h / 15h-19h.',
}

const DAYS_SHORT = ['', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

type DayType = 'off' | 'office' | 'remote' | 'half'
type DayConfigEntry = { type: Exclude<DayType, 'off'>; startTime: string; endTime: string }

function calcDayHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return Math.max(0, Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 2) / 2)
}

const DAY_CONFIG_STYLES: Record<Exclude<DayType, 'off'>, { bg: string; title: string }> = {
  office: { bg: 'bg-[var(--pp-info)] text-white',  title: 'Bureau' },
  remote: { bg: 'bg-cyan-500 text-white',           title: 'Télétravail' },
  half:   { bg: 'bg-orange-500 text-white',         title: 'Demi-journée' },
}

function parseDayType(entry: unknown): Exclude<DayType, 'off'> {
  if (typeof entry === 'string') return entry as Exclude<DayType, 'off'>
  if (entry && typeof entry === 'object' && 'type' in entry) return (entry as DayConfigEntry).type
  return 'office'
}

function DayBadges({ daysJson, dayConfigJson }: { daysJson: string; dayConfigJson?: string | null }) {
  let days: number[] = []
  let cfg: Record<string, unknown> = {}
  try { days = JSON.parse(daysJson) } catch { }
  try { if (dayConfigJson) cfg = JSON.parse(dayConfigJson) } catch { }

  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7].map(d => {
        const worked = days.includes(d)
        const type = worked ? parseDayType(cfg[d] ?? cfg[String(d)]) : null
        const style = type ? DAY_CONFIG_STYLES[type] : null
        return (
          <span
            key={d}
            title={style?.title}
            className={`text-[10px] px-1 py-0.5 rounded font-medium ${
              style ? style.bg : 'bg-[var(--pp-line)] text-[var(--pp-muted)]'
            }`}
          >
            {DAYS_SHORT[d]}
          </span>
        )
      })}
    </span>
  )
}

// ── Tab 1: Affectations ──────────────────────────────────────────────────────

interface TeamRotationInfo { teamName: string; cycleName: string }

function AssignmentsTab({ allSchedules }: { allSchedules: WorkSchedule[] }) {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [pending, setPending] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [rotationMap, setRotationMap] = useState<Record<string, TeamRotationInfo>>({})

  const fetchRows = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/schedule').then(r => r.json()),
      fetch('/api/admin/teams').then(r => r.ok ? r.json() : { teams: [] }),
    ])
      .then(([schedData, teamsData]) => {
        setRows(schedData.schedules ?? [])
        const map: Record<string, TeamRotationInfo> = {}
        for (const team of (teamsData.teams ?? [])) {
          if (!team.rotationCycle) continue
          for (const member of team.members) {
            map[member.userId] = { teamName: team.name, cycleName: team.rotationCycle.name }
          }
        }
        setRotationMap(map)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  const currentScheduleId = (row: UserRow) =>
    pending[row.userId] !== undefined ? pending[row.userId] : (row.scheduleId ?? '')

  const save = async (userId: string) => {
    const rawId = pending[userId] ?? ''
    const scheduleId = rawId === '' ? null : rawId
    setSaving(userId)
    setError('')
    const res = await fetch('/api/admin/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, scheduleId }),
    })
    if (!res.ok) setError((await res.json()).error ?? 'Erreur')
    setSaving(null)
    setPending(p => { const n = { ...p }; delete n[userId]; return n })
    fetchRows()
  }

  if (loading) return <p className="text-[var(--pp-muted)] text-sm py-8 text-center">Chargement…</p>

  const filteredRows = rows.filter(row => {
    const q = search.toLowerCase()
    return !q || (row.user.name ?? '').toLowerCase().includes(q) || row.user.email.toLowerCase().includes(q)
  })

  const customSchedules = allSchedules.filter(s => !s.isPreset)
  const presetSchedules = allSchedules.filter(s => s.isPreset)

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-[var(--pp-neg)]">{error}</p>}
      <div className="mb-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un employé…"
          className="w-full max-w-sm px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
        />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                <th className="pb-3 pr-4 font-medium w-48">Employé</th>
                <th className="pb-3 pr-4 font-medium">Régime de travail</th>
                <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Seuil heures sup.</th>
                <th className="pb-3 font-medium w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pp-line)]">
              {filteredRows.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-[var(--pp-muted)] text-sm italic">Aucun utilisateur.</td></tr>
              )}
              {filteredRows.map(row => {
                const selId = currentScheduleId(row)
                const dirty = pending[row.userId] !== undefined
                const selectedSchedule = allSchedules.find(s => s.id === selId)

                return (
                  <tr key={row.userId}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[var(--pp-ink)]">{row.user.name ?? '—'}</p>
                      <p className="text-xs text-[var(--pp-muted)]">{row.user.email}</p>
                      {rotationMap[row.userId] && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium" title="Le cycle de rotation de l'équipe prend le dessus sur cet horaire pour le planning automatique">
                          ↻ {rotationMap[row.userId].teamName} · {rotationMap[row.userId].cycleName}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {rotationMap[row.userId] ? (
                        <div className="flex items-center gap-2 text-sm text-[var(--pp-muted)] italic">
                          <span>↻ Géré par le cycle de rotation</span>
                        </div>
                      ) : (
                        <>
                          <select
                            value={selId}
                            onChange={e => setPending(p => ({ ...p, [row.userId]: e.target.value }))}
                            className="px-2 py-1.5 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] w-52"
                          >
                            <option value="">— Non configuré —</option>
                            {customSchedules.length > 0 && (
                              <optgroup label="Mes gabarits">
                                {customSchedules.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Gabarits prédéfinis">
                              {presetSchedules.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </optgroup>
                          </select>
                          {selectedSchedule && (
                            <p className="text-xs text-[var(--pp-muted)] mt-1 max-w-xs leading-relaxed">
                              {selectedSchedule.startTime}–{selectedSchedule.endTime} · {selectedSchedule.hoursPerDay}h/j · {selectedSchedule.weeklyHours}h/sem
                              {selectedSchedule.description && ` — ${selectedSchedule.description}`}
                            </p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      {rotationMap[row.userId] ? null : selectedSchedule ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--pp-info)]/10 text-[var(--pp-info)]">
                          &gt; {selectedSchedule.hoursPerDay}h/jour = heure sup.
                        </span>
                      ) : (
                        <span className="text-xs italic text-[var(--pp-muted)]">
                          Défaut : &gt; {row.hoursPerDay}h/jour
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {!rotationMap[row.userId] && dirty && (
                        <Button size="sm" onClick={() => save(row.userId)} disabled={saving === row.userId}>
                          {saving === row.userId ? '…' : 'Sauver'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── Tab 2: Gabarits ──────────────────────────────────────────────────────────

const DAY_CYCLE: DayType[] = ['off', 'office', 'remote', 'half']

const DAY_BUTTON_STYLES: Record<DayType, string> = {
  off:    'border-[var(--pp-line)] text-[var(--pp-muted)] hover:border-[var(--pp-info)]',
  office: 'bg-[var(--pp-info)] text-white border-[var(--pp-info)]',
  remote: 'bg-cyan-500 text-white border-cyan-500',
  half:   'bg-orange-500 text-white border-orange-500',
}

const DAY_BUTTON_TITLES: Record<DayType, string> = {
  off:    'Inactif — cliquer pour activer (bureau)',
  office: 'Bureau — cliquer : télétravail',
  remote: 'Télétravail — cliquer : demi-journée',
  half:   'Demi-journée — cliquer : désactiver',
}

function makeDefaultDayConfig(days: number[], startTime: string, endTime: string): Record<number, DayConfigEntry> {
  return Object.fromEntries(days.map(d => [d, { type: 'office' as const, startTime, endTime }]))
}

const EMPTY_FORM = {
  name: '', type: 'JOURNEE', startTime: '09:00', endTime: '17:00',
  daysOfWeek: [1, 2, 3, 4, 5],
  dayConfig: makeDefaultDayConfig([1, 2, 3, 4, 5], '09:00', '17:00'),
  description: '',
}

function TemplatesTab({ templates, onRefresh }: { templates: WorkSchedule[], onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const weeklyHoursCalc = useMemo(() => {
    let total = 0
    for (const d of form.daysOfWeek) {
      const e = form.dayConfig[d]
      total += calcDayHours(e?.startTime ?? form.startTime, e?.endTime ?? form.endTime)
    }
    return Math.round(total * 2) / 2
  }, [form.daysOfWeek, form.dayConfig, form.startTime, form.endTime])

  const hoursPerDayCalc = useMemo(() => {
    if (form.daysOfWeek.length === 0) return 0
    return Math.round(weeklyHoursCalc / form.daysOfWeek.length * 2) / 2
  }, [weeklyHoursCalc, form.daysOfWeek.length])

  const getDayState = (d: number): DayType => {
    if (!form.daysOfWeek.includes(d)) return 'off'
    return form.dayConfig[d]?.type ?? 'office'
  }

  const cycleDay = (d: number) => {
    const current = getDayState(d)
    const next = DAY_CYCLE[(DAY_CYCLE.indexOf(current) + 1) % DAY_CYCLE.length]
    setForm(f => {
      const newDays = next === 'off'
        ? f.daysOfWeek.filter(x => x !== d)
        : f.daysOfWeek.includes(d) ? f.daysOfWeek : [...f.daysOfWeek, d].sort()
      const newCfg = { ...f.dayConfig }
      if (next === 'off') {
        delete newCfg[d]
      } else {
        newCfg[d] = {
          type: next as Exclude<DayType, 'off'>,
          startTime: newCfg[d]?.startTime ?? f.startTime,
          endTime: newCfg[d]?.endTime ?? f.endTime,
        }
      }
      return { ...f, daysOfWeek: newDays, dayConfig: newCfg }
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est requis.'); return }
    if (!form.startTime || !form.endTime) { setError('Les heures de début et fin sont requises.'); return }
    setSaving(true)
    setError('')
    const method = editId ? 'PATCH' : 'POST'
    const payload = {
      name: form.name,
      type: form.type,
      startTime: form.startTime,
      endTime: form.endTime,
      hoursPerDay: hoursPerDayCalc,
      weeklyHours: weeklyHoursCalc,
      daysOfWeek: form.daysOfWeek,
      dayConfig: Object.keys(form.dayConfig).length > 0 ? JSON.stringify(form.dayConfig) : null,
      description: form.description,
      ...(editId && { id: editId }),
    }
    const res = await fetch('/api/admin/work-schedules', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      setError((await res.json()).error ?? 'Erreur serveur')
      setSaving(false)
      return
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    onRefresh()
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer ce gabarit ?')) return
    const res = await fetch(`/api/admin/work-schedules?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { alert((await res.json()).error); return }
    onRefresh()
  }

  const startEdit = (t: WorkSchedule) => {
    setEditId(t.id)
    const days: number[] = JSON.parse(t.daysOfWeek)
    const parsedDayConfig: Record<number, DayConfigEntry> = {}
    try {
      if (t.dayConfig) {
        const raw = JSON.parse(t.dayConfig) as Record<string, unknown>
        for (const [key, val] of Object.entries(raw)) {
          const d = parseInt(key)
          if (typeof val === 'string') {
            parsedDayConfig[d] = { type: val as Exclude<DayType, 'off'>, startTime: t.startTime, endTime: t.endTime }
          } else if (val && typeof val === 'object' && 'type' in val) {
            const v = val as Partial<DayConfigEntry>
            parsedDayConfig[d] = { type: v.type ?? 'office', startTime: v.startTime ?? t.startTime, endTime: v.endTime ?? t.endTime }
          }
        }
      }
    } catch {}
    for (const d of days) {
      if (!parsedDayConfig[d]) parsedDayConfig[d] = { type: 'office', startTime: t.startTime, endTime: t.endTime }
    }
    setForm({
      name: t.name, type: t.type,
      startTime: t.startTime, endTime: t.endTime,
      daysOfWeek: days,
      dayConfig: parsedDayConfig,
      description: t.description ?? '',
    })
    setShowForm(true)
    setError('')
  }

  const cancelForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); setError('') }

  const presets = templates.filter(t => t.isPreset)
  const customs = templates.filter(t => !t.isPreset)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--pp-ink)]">Gabarits personnalisés</h2>
        {!showForm && (
          <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}>
            + Nouveau gabarit
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <h3 className="font-semibold text-[var(--pp-ink)] mb-4">
            {editId ? 'Modifier le gabarit' : 'Nouveau gabarit'}
          </h3>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}
          <form onSubmit={submit} className="space-y-4 max-w-lg">

            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Nom du gabarit *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: 3×8 Équipe A, Matin usine, Nuit week-end…"
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Type de régime *</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {form.type && (
                <p className="text-xs text-[var(--pp-muted)] mt-1.5 leading-relaxed">
                  {TYPE_DESCRIPTIONS[form.type]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Début du quart *</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Fin du quart *</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-2">
                Jours travaillés
                <span className="ml-2 font-normal opacity-60">(clic = bureau → télétravail → demi-journée → inactif)</span>
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map(d => {
                  const state = getDayState(d)
                  return (
                    <button
                      key={d} type="button"
                      onClick={() => cycleDay(d)}
                      title={DAY_BUTTON_TITLES[state]}
                      className={`w-9 py-1.5 rounded text-xs font-medium border transition ${DAY_BUTTON_STYLES[state]}`}
                    >
                      {DAYS_SHORT[d]}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-2">
                {([['office', 'var(--pp-info)', 'Bureau'], ['remote', '#06b6d4', 'Télétravail'], ['half', '#f97316', 'Demi-journée']] as const).map(([, color, label]) => (
                  <span key={label} className="flex items-center gap-1 text-[10px] text-[var(--pp-muted)]">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>

              {/* Per-day hours table */}
              {form.daysOfWeek.length > 0 && (
                <div className="mt-3 border border-[var(--pp-line)] rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--pp-bg2)]">
                        <th className="text-left px-3 py-2 text-[var(--pp-muted)] font-medium w-10">Jour</th>
                        <th className="px-2 py-2 text-[var(--pp-muted)] font-medium text-center">Début</th>
                        <th className="px-2 py-2 text-[var(--pp-muted)] font-medium text-center">Fin</th>
                        <th className="px-3 py-2 text-[var(--pp-muted)] font-medium text-right">Durée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--pp-line)]">
                      {[...form.daysOfWeek].sort((a, b) => a - b).map(d => {
                        const entry = form.dayConfig[d]
                        const st = entry?.startTime ?? form.startTime
                        const et = entry?.endTime ?? form.endTime
                        const dtype = entry?.type ?? 'office'
                        const hours = calcDayHours(st, et)
                        const color = dtype === 'remote' ? 'text-cyan-400' : dtype === 'half' ? 'text-orange-400' : 'text-[var(--pp-info)]'
                        return (
                          <tr key={d} className="hover:bg-[var(--pp-bg2)]/40">
                            <td className={`px-3 py-1.5 font-semibold ${color}`}>{DAYS_SHORT[d]}</td>
                            <td className="px-2 py-1 text-center">
                              <input
                                type="time" value={st}
                                onChange={e => setForm(f => ({
                                  ...f,
                                  dayConfig: { ...f.dayConfig, [d]: { ...(f.dayConfig[d] ?? { type: 'office' as const }), startTime: e.target.value } }
                                }))}
                                className="w-24 px-2 py-1 border border-[var(--pp-line)] rounded text-xs bg-[var(--pp-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--pp-info)]"
                              />
                            </td>
                            <td className="px-2 py-1 text-center">
                              <input
                                type="time" value={et}
                                onChange={e => setForm(f => ({
                                  ...f,
                                  dayConfig: { ...f.dayConfig, [d]: { ...(f.dayConfig[d] ?? { type: 'office' as const }), endTime: e.target.value } }
                                }))}
                                className="w-24 px-2 py-1 border border-[var(--pp-line)] rounded text-xs bg-[var(--pp-bg)] focus:outline-none focus:ring-1 focus:ring-[var(--pp-info)]"
                              />
                            </td>
                            <td className={`px-3 py-1.5 text-right font-bold ${color}`}>{hours}h</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[var(--pp-bg2)] border-t border-[var(--pp-line)]">
                        <td colSpan={2} className="px-3 py-1.5 text-[var(--pp-muted)] text-xs font-medium">Total</td>
                        <td className="px-3 py-1.5 text-right text-xs font-bold text-[var(--pp-ink)]" colSpan={2}>
                          {weeklyHoursCalc}h/sem · {hoursPerDayCalc}h/j moy.
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Description (optionnel)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Contexte ou particularités de cet horaire"
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Enregistrement…' : editId ? 'Modifier' : 'Créer le gabarit'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={cancelForm}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      {customs.length === 0 ? (
        <p className="text-sm text-[var(--pp-muted)] italic">
          Aucun gabarit personnalisé. Créez le vôtre ou assignez directement un preset.
        </p>
      ) : (
        <ScheduleGrid templates={customs} onEdit={startEdit} onDelete={del} editable />
      )}

      <div>
        <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-1">Gabarits prédéfinis</h2>
        <p className="text-xs text-[var(--pp-muted)] mb-4">
          Basés sur les régimes de travail posté belges.
        </p>
        <ScheduleGrid templates={presets} onEdit={startEdit} onDelete={del} editable />
      </div>
    </div>
  )
}

function ScheduleGrid({ templates, onEdit, onDelete, editable }: {
  templates: WorkSchedule[]
  onEdit?: (t: WorkSchedule) => void
  onDelete?: (id: string) => void
  editable?: boolean
}) {
  const grouped = templates.reduce<Record<string, WorkSchedule[]>>((acc, t) => {
    acc[t.type] = [...(acc[t.type] ?? []), t]
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([type, list]) => (
        <div key={type}>
          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-xs font-semibold text-[var(--pp-muted)] uppercase tracking-wider">
              {TYPE_LABELS[type] ?? type}
            </p>
            <p className="text-xs text-[var(--pp-muted)]">— {TYPE_DESCRIPTIONS[type]}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map(t => (
              <div key={t.id} className="border border-[var(--pp-line)] rounded-lg p-4 bg-[var(--pp-bg)] hover:border-[var(--pp-info)]/40 transition">
                <div className="flex items-start justify-between mb-1.5">
                  <p className="font-semibold text-[var(--pp-ink)] text-sm">{t.name}</p>
                  {editable && (
                    <div className="flex gap-2 ml-2 shrink-0">
                      <button onClick={() => onEdit?.(t)} className="text-xs text-[var(--pp-info)] hover:underline">Modifier</button>
                      <button onClick={() => onDelete?.(t.id)} className="text-xs text-[var(--pp-neg)] hover:underline">Suppr.</button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--pp-muted)] mb-2">
                  {t.startTime}–{t.endTime} &nbsp;·&nbsp; {t.hoursPerDay}h/j &nbsp;·&nbsp; {t.weeklyHours}h/sem
                </p>
                <DayBadges daysJson={t.daysOfWeek} dayConfigJson={t.dayConfig} />
                {t.description && (
                  <p className="text-xs text-[var(--pp-muted)] mt-2 leading-relaxed">{t.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const [tab, setTab] = useState<'assignments' | 'templates'>('assignments')
  const [templates, setTemplates] = useState<WorkSchedule[]>([])

  const fetchTemplates = useCallback(() => {
    fetch('/api/admin/work-schedules')
      .then(r => r.json())
      .then(d => setTemplates(d.schedules ?? []))
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Horaires de travail</h1>
        <p className="text-[var(--pp-muted)] text-sm mt-1">
          Assignez un gabarit d'horaire à chaque employé. Créez vos propres modèles ou utilisez les presets belges.
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
          ↻ Les employés membres d&apos;une équipe avec cycle de rotation n&apos;ont pas besoin d&apos;horaire fixe — la rotation détermine automatiquement leurs shifts dans le planning.
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[var(--pp-line)]">
        {(['assignments', 'templates'] as const).map(t => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t
                ? 'border-[var(--pp-info)] text-[var(--pp-info)]'
                : 'border-transparent text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
            }`}
          >
            {t === 'assignments' ? 'Affectations' : 'Gabarits'}
          </button>
        ))}
      </div>

      {tab === 'assignments'
        ? <AssignmentsTab allSchedules={templates} />
        : <TemplatesTab templates={templates} onRefresh={fetchTemplates} />
      }
    </div>
  )
}
