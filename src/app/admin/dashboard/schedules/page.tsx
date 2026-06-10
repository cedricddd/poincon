'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
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

function DayBadges({ daysJson }: { daysJson: string }) {
  let days: number[] = []
  try { days = JSON.parse(daysJson) } catch { }
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7].map(d => (
        <span key={d} className={`text-[10px] px-1 py-0.5 rounded font-medium ${
          days.includes(d)
            ? 'bg-[var(--pp-info)] text-white'
            : 'bg-[var(--pp-line)] text-[var(--pp-muted)]'
        }`}>
          {DAYS_SHORT[d]}
        </span>
      ))}
    </span>
  )
}

// Heures/jour de référence par type (pour affichage dans le dropdown)
const TYPE_HOURS: Record<string, number> = {
  JOURNEE: 8, '2X8': 8, '3X8': 8, '4X8': 8, '5X8': 8,
  '2X12': 12, NUIT: 8, PARTIEL: 4, VARIABLE: 8,
}

// ── Tab 1: Affectations ──────────────────────────────────────────────────────

interface TeamRotationInfo { teamName: string; cycleName: string; phaseBadge: string | null }

function AssignmentsTab() {
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
        // Build userId → rotation info map
        const map: Record<string, TeamRotationInfo> = {}
        for (const team of (teamsData.teams ?? [])) {
          if (!team.rotationCycle) continue
          for (const member of team.members) {
            map[member.userId] = {
              teamName: team.name,
              cycleName: team.rotationCycle.name,
              phaseBadge: null,
            }
          }
        }
        setRotationMap(map)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  const currentType = (row: UserRow) =>
    pending[row.userId] !== undefined
      ? pending[row.userId]
      : (row.workSchedule?.type ?? '')

  const save = async (userId: string) => {
    const scheduleType = pending[userId] || null
    setSaving(userId)
    setError('')
    const res = await fetch('/api/admin/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, scheduleType }),
    })
    if (!res.ok) setError((await res.json()).error ?? 'Erreur')
    setSaving(null)
    setPending(p => { const n = { ...p }; delete n[userId]; return n })
    fetchRows()
  }

  if (loading) return <p className="text-[var(--pp-muted)] text-sm py-8 text-center">Chargement…</p>

  const filteredRows = rows.filter(row => {
    const q = search.toLowerCase()
    return !q
      || (row.user.name ?? '').toLowerCase().includes(q)
      || row.user.email.toLowerCase().includes(q)
  })

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
                const type = currentType(row)
                const dirty = pending[row.userId] !== undefined
                const hours = type ? TYPE_HOURS[type] : null

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
                      <select
                        value={type}
                        onChange={e => setPending(p => ({ ...p, [row.userId]: e.target.value }))}
                        className="px-2 py-1.5 border border-[var(--pp-line)] rounded-lg text-sm bg-[var(--pp-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] w-48"
                      >
                        <option value="">— Non configuré —</option>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      {type && (
                        <p className="text-xs text-[var(--pp-muted)] mt-1 max-w-xs leading-relaxed">
                          {TYPE_DESCRIPTIONS[type]}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      {hours !== null ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--pp-info)]/10 text-[var(--pp-info)]">
                          &gt; {hours}h/jour = heure sup.
                        </span>
                      ) : (
                        <span className="text-xs italic text-[var(--pp-muted)]">
                          Défaut : &gt; {row.hoursPerDay}h/jour
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {dirty && (
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

const EMPTY_FORM = {
  name: '', type: 'JOURNEE', startTime: '09:00', endTime: '17:00',
  hoursPerDay: 8, weeklyHours: 38, daysOfWeek: [1, 2, 3, 4, 5], description: '',
}

function TemplatesTab({ templates, onRefresh }: { templates: WorkSchedule[], onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleDay = (d: number) =>
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d)
        ? f.daysOfWeek.filter(x => x !== d)
        : [...f.daysOfWeek, d].sort(),
    }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est requis.'); return }
    if (!form.startTime || !form.endTime) { setError('Les heures de début et fin sont requises.'); return }
    setSaving(true)
    setError('')
    const method = editId ? 'PATCH' : 'POST'
    const body = editId ? { ...form, id: editId } : form
    const res = await fetch('/api/admin/work-schedules', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    setForm({
      name: t.name, type: t.type,
      startTime: t.startTime, endTime: t.endTime,
      hoursPerDay: t.hoursPerDay, weeklyHours: t.weeklyHours,
      daysOfWeek: JSON.parse(t.daysOfWeek),
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Heures / jour</label>
                <input
                  type="number" step="0.5" min="1" max="24"
                  value={form.hoursPerDay}
                  onChange={e => setForm(f => ({ ...f, hoursPerDay: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Heures / semaine</label>
                <input
                  type="number" step="0.5" min="1" max="60"
                  value={form.weeklyHours}
                  onChange={e => setForm(f => ({ ...f, weeklyHours: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-2">Jours travaillés</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                  <button
                    key={d} type="button" onClick={() => toggleDay(d)}
                    className={`w-9 py-1.5 rounded text-xs font-medium border transition ${
                      form.daysOfWeek.includes(d)
                        ? 'bg-[var(--pp-info)] text-white border-[var(--pp-info)]'
                        : 'border-[var(--pp-line)] text-[var(--pp-muted)] hover:border-[var(--pp-info)]'
                    }`}
                  >
                    {DAYS_SHORT[d]}
                  </button>
                ))}
              </div>
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
                <DayBadges daysJson={t.daysOfWeek} />
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
        ? <AssignmentsTab />
        : <TemplatesTab templates={templates} onRefresh={fetchTemplates} />
      }
    </div>
  )
}
