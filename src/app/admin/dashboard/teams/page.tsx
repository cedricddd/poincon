'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { showToast } from '@/hooks/useToast'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeBanner } from '@/components/UpgradeBanner'
import { getCurrentPeriod, parseWorkDays } from '@/lib/rotation'

const SHIFT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  DAY:       { label: 'Journée',     color: 'bg-blue-100 text-blue-700' },
  MORNING:   { label: 'Matin',       color: 'bg-amber-100 text-amber-700' },
  AFTERNOON: { label: 'Après-midi',  color: 'bg-orange-100 text-orange-700' },
  NIGHT:     { label: 'Nuit',        color: 'bg-indigo-100 text-indigo-700' },
}
const WORK_DAYS_LABELS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface RotationPeriod {
  id: string
  order: number
  label: string
  shiftType: string | null
  startTime: string | null
  endTime: string | null
  workDays: string
}

interface RotationCycle {
  id: string
  name: string
  periodUnit: 'WEEK' | 'DAY'
  anchorDate: string
  periods: RotationPeriod[]
  teams: { id: string; name: string; rotationPhase: number | null }[]
}

interface TeamMember {
  id: string
  userId: string
  role: string
  user: { id: string; name: string | null; email: string; role: string }
}

interface Team {
  id: string
  name: string
  members: TeamMember[]
  rotationCycleId: string | null
  rotationPhase: number | null
  rotationCycle: RotationCycle | null
}

interface User {
  id: string
  name: string | null
  email: string
  role: string
}

type Tab = 'teams' | 'cycles'

const EMPTY_PERIOD = (): Omit<RotationPeriod, 'id' | 'cycleId'> => ({
  order: 0,
  label: '',
  shiftType: null,
  startTime: null,
  endTime: null,
  workDays: '[1,2,3,4,5]',
})

export default function TeamsPage() {
  const { planInfo, upgradeTo } = usePlan()
  const [tab, setTab] = useState<Tab>('teams')

  // Teams state
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [cycles, setCycles] = useState<RotationCycle[]>([])
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Cycles state
  const [showCycleForm, setShowCycleForm] = useState(false)
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null)
  const [cycleName, setCycleName] = useState('')
  const [cyclePeriodUnit, setCyclePeriodUnit] = useState<'WEEK' | 'DAY'>('WEEK')
  const [cycleAnchorDate, setCycleAnchorDate] = useState(() => new Date().toISOString().split('T')[0])
  const [cyclePeriods, setCyclePeriods] = useState<Omit<RotationPeriod, 'id' | 'cycleId'>[]>([EMPTY_PERIOD()])
  const [savingCycle, setSavingCycle] = useState(false)

  const fetchData = async () => {
    const [teamsRes, usersRes, cyclesRes] = await Promise.all([
      fetch('/api/admin/teams'),
      fetch('/api/admin/users'),
      fetch('/api/admin/rotation-cycles'),
    ])
    if (teamsRes.ok) setTeams((await teamsRes.json()).teams ?? [])
    if (usersRes.ok) setUsers((await usersRes.json()).users ?? [])
    if (cyclesRes.ok) setCycles((await cyclesRes.json()).cycles ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // --- Team actions ---
  const createTeam = async () => {
    if (!newTeamName.trim()) return
    setCreating(true)
    const res = await fetch('/api/admin/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName.trim() }),
    })
    if (res.ok) { setNewTeamName(''); fetchData(); showToast('Équipe créée', 'success') }
    else showToast((await res.json()).error ?? 'Erreur', 'error')
    setCreating(false)
  }

  const renameTeam = async (id: string) => {
    if (!editName.trim()) return
    const res = await fetch('/api/admin/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editName.trim() }),
    })
    if (res.ok) { setEditingId(null); fetchData(); showToast('Renommée', 'success') }
  }

  const deleteTeam = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'équipe "${name}" ?`)) return
    await fetch(`/api/admin/teams?id=${id}`, { method: 'DELETE' })
    fetchData()
    showToast('Équipe supprimée', 'success')
  }

  const addMember = async (teamId: string, userId: string, role = 'member') => {
    const res = await fetch('/api/admin/teams/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, userId, role }),
    })
    if (res.ok) { fetchData(); showToast('Membre ajouté', 'success') }
    else showToast('Erreur', 'error')
  }

  const removeMember = async (teamId: string, userId: string) => {
    await fetch(`/api/admin/teams/members?teamId=${teamId}&userId=${userId}`, { method: 'DELETE' })
    fetchData()
    showToast('Membre retiré', 'success')
  }

  const assignRotation = async (teamId: string, rotationCycleId: string | null, rotationPhase: number | null) => {
    const res = await fetch('/api/admin/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: teamId, rotationCycleId, rotationPhase }),
    })
    if (res.ok) { fetchData(); showToast('Rotation assignée', 'success') }
    else showToast('Erreur', 'error')
  }

  // --- Cycle form helpers ---
  const openCreateCycle = () => {
    setEditingCycleId(null)
    setCycleName('')
    setCyclePeriodUnit('WEEK')
    setCycleAnchorDate(new Date().toISOString().split('T')[0])
    setCyclePeriods([{ ...EMPTY_PERIOD(), order: 0 }])
    setShowCycleForm(true)
  }

  const openEditCycle = (cycle: RotationCycle) => {
    setEditingCycleId(cycle.id)
    setCycleName(cycle.name)
    setCyclePeriodUnit(cycle.periodUnit)
    setCycleAnchorDate(cycle.anchorDate.split('T')[0])
    setCyclePeriods(cycle.periods.map(p => ({
      order: p.order,
      label: p.label,
      shiftType: p.shiftType,
      startTime: p.startTime,
      endTime: p.endTime,
      workDays: p.workDays,
    })))
    setShowCycleForm(true)
  }

  const addPeriod = () => {
    setCyclePeriods(prev => [...prev, { ...EMPTY_PERIOD(), order: prev.length }])
  }

  const removePeriod = (i: number) => {
    setCyclePeriods(prev => prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, order: idx })))
  }

  const updatePeriod = (i: number, field: string, value: string | null) => {
    setCyclePeriods(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  const toggleWorkDay = (periodIdx: number, day: number) => {
    setCyclePeriods(prev => prev.map((p, idx) => {
      if (idx !== periodIdx) return p
      const days = parseWorkDays(p.workDays)
      const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort()
      return { ...p, workDays: JSON.stringify(next) }
    }))
  }

  const saveCycle = async () => {
    if (!cycleName.trim()) return showToast('Nom requis', 'error')
    if (cyclePeriods.some(p => !p.label.trim())) return showToast('Chaque période doit avoir un nom', 'error')
    setSavingCycle(true)

    const payload = {
      name: cycleName.trim(),
      periodUnit: cyclePeriodUnit,
      anchorDate: cycleAnchorDate,
      periods: cyclePeriods,
    }

    const res = editingCycleId
      ? await fetch('/api/admin/rotation-cycles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCycleId, ...payload }),
        })
      : await fetch('/api/admin/rotation-cycles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    if (res.ok) {
      setShowCycleForm(false)
      fetchData()
      showToast(editingCycleId ? 'Cycle mis à jour' : 'Cycle créé', 'success')
    } else {
      showToast((await res.json()).error ?? 'Erreur', 'error')
    }
    setSavingCycle(false)
  }

  const deleteCycle = async (id: string, name: string) => {
    if (!confirm(`Supprimer le cycle "${name}" ? Les équipes assignées perdront leur cycle.`)) return
    const res = await fetch(`/api/admin/rotation-cycles?id=${id}`, { method: 'DELETE' })
    if (res.ok) { fetchData(); showToast('Cycle supprimé', 'success') }
  }

  const getCurrentPhaseBadge = (team: Team): string | null => {
    if (!team.rotationCycle || team.rotationPhase == null) return null
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
    const period = getCurrentPeriod(teamData, new Date())
    return period?.label ?? null
  }

  if (loading) return <div className="p-8 text-center">Chargement...</div>

  const planLocked = planInfo && !planInfo.canTeams

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Équipes & Rotations</h1>
        <p className="text-sm text-[var(--pp-muted)] mt-1">Gérez vos équipes, assignez des cycles de rotation pour le planning automatique.</p>
      </div>

      {planInfo && !planInfo.canTeams && (
        <UpgradeBanner
          currentPlan={planInfo.plan}
          upgradeTo="TEAM"
          feature="Gestion des équipes"
          description="Les équipes et cycles de rotation permettent de générer automatiquement les plannings tournants. Disponible à partir du plan TEAM."
          variant="mauve"
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--pp-line)]">
        <button
          onClick={() => setTab('teams')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'teams' ? 'border-[var(--pp-info)] text-[var(--pp-info)]' : 'border-transparent text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'}`}
        >
          Équipes ({teams.length})
        </button>
        <button
          onClick={() => setTab('cycles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'cycles' ? 'border-[var(--pp-info)] text-[var(--pp-info)]' : 'border-transparent text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'}`}
        >
          Cycles de rotation ({cycles.length})
        </button>
      </div>

      {/* ─── TAB: ÉQUIPES ─── */}
      {tab === 'teams' && (
        <div className={`space-y-5 ${planLocked ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {/* Créer une équipe */}
          <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[var(--pp-ink)] mb-3">Nouvelle équipe</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createTeam()}
                placeholder="Nom de l'équipe..."
                className="flex-1 border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
              />
              <button
                onClick={createTeam}
                disabled={creating || !newTeamName.trim()}
                className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-12 text-[var(--pp-muted)]">Aucune équipe créée.</div>
          ) : (
            teams.map(team => {
              const memberIds = new Set(team.members.map(m => m.userId))
              const available = users.filter(u => !memberIds.has(u.id))
              const phaseBadge = getCurrentPhaseBadge(team)

              return (
                <div key={team.id} className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--pp-line)] bg-[var(--pp-info)]/5">
                    {editingId === team.id ? (
                      <div className="flex gap-2 flex-1">
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && renameTeam(team.id)}
                          className="border border-[var(--pp-line)] rounded px-2 py-1 text-sm flex-1"
                        />
                        <button onClick={() => renameTeam(team.id)} className="text-xs px-3 py-1 bg-[var(--pp-info)] text-white rounded">OK</button>
                        <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1 border border-[var(--pp-line)] rounded">Annuler</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-[var(--pp-ink)]">{team.name}</span>
                        <span className="text-xs text-[var(--pp-muted)]">{team.members.length} membre{team.members.length !== 1 ? 's' : ''}</span>
                        {phaseBadge && (
                          <span className="text-xs px-2 py-0.5 bg-[var(--pp-info)]/10 text-[var(--pp-info)] rounded-full font-medium">
                            Cette semaine : {phaseBadge}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setEditingId(team.id); setEditName(team.name) }} className="text-xs px-3 py-1 border border-[var(--pp-line)] rounded hover:bg-gray-50">
                        Renommer
                      </button>
                      <button onClick={() => deleteTeam(team.id, team.name)} className="text-xs px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50">
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {/* Rotation assignment */}
                  <div className="px-5 py-3 bg-[var(--pp-bg)] border-b border-[var(--pp-line)] flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium text-[var(--pp-muted)] shrink-0">Cycle :</span>
                    <select
                      value={team.rotationCycleId ?? ''}
                      onChange={e => {
                        const cycleId = e.target.value || null
                        assignRotation(team.id, cycleId, cycleId ? 0 : null)
                      }}
                      className="border border-[var(--pp-line)] rounded px-2 py-1 text-xs"
                    >
                      <option value="">— Aucun —</option>
                      {cycles.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {team.rotationCycle && (
                      <>
                        <span className="text-xs font-medium text-[var(--pp-muted)] shrink-0">Phase :</span>
                        <select
                          value={team.rotationPhase ?? 0}
                          onChange={e => assignRotation(team.id, team.rotationCycleId, Number(e.target.value))}
                          className="border border-[var(--pp-line)] rounded px-2 py-1 text-xs"
                        >
                          {team.rotationCycle.periods.map(p => (
                            <option key={p.order} value={p.order}>
                              Phase {p.order} — {p.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-[var(--pp-muted)]">
                          Unité : {team.rotationCycle.periodUnit === 'WEEK' ? 'semaine' : 'jour'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Members */}
                  <div className="divide-y divide-[var(--pp-line)]">
                    {team.members.map(m => (
                      <div key={m.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <span className="text-sm font-medium text-[var(--pp-ink)]">{m.user.name ?? m.user.email}</span>
                          <span className="text-xs text-[var(--pp-muted)] ml-2">{m.user.email}</span>
                          {m.role === 'manager' && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--pp-info)]/10 text-[var(--pp-info)] rounded-full font-medium">Manager</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {m.role !== 'manager' && (
                            <button onClick={() => addMember(team.id, m.userId, 'manager')} className="text-xs px-2 py-1 border border-[var(--pp-info)] text-[var(--pp-info)] rounded hover:bg-[var(--pp-info)]/5">
                              → Manager
                            </button>
                          )}
                          <button onClick={() => removeMember(team.id, m.userId)} className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50">
                            Retirer
                          </button>
                        </div>
                      </div>
                    ))}

                    {available.length > 0 && (
                      <div className="px-5 py-3 bg-gray-50 flex items-center gap-3">
                        <select
                          className="flex-1 border border-[var(--pp-line)] rounded px-2 py-1.5 text-sm"
                          defaultValue=""
                          onChange={e => { if (e.target.value) { addMember(team.id, e.target.value); e.target.value = '' } }}
                        >
                          <option value="" disabled>+ Ajouter un employé...</option>
                          {available.map(u => (
                            <option key={u.id} value={u.id}>{u.name ?? u.email} ({u.email})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ─── TAB: CYCLES DE ROTATION ─── */}
      {tab === 'cycles' && (
        <div className={`space-y-5 ${planLocked ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {!showCycleForm && (
            <div className="flex justify-end">
              <button onClick={openCreateCycle} className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90">
                + Nouveau cycle
              </button>
            </div>
          )}

          {/* Cycle form */}
          {showCycleForm && (
            <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5 space-y-5">
              <h2 className="text-sm font-semibold text-[var(--pp-ink)]">
                {editingCycleId ? 'Modifier le cycle' : 'Nouveau cycle de rotation'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--pp-muted)] block mb-1">Nom du cycle</label>
                  <input
                    value={cycleName}
                    onChange={e => setCycleName(e.target.value)}
                    placeholder="ex: 3x8 Quart, Jour/Nuit..."
                    className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--pp-muted)] block mb-1">Unité de période</label>
                  <select
                    value={cyclePeriodUnit}
                    onChange={e => setCyclePeriodUnit(e.target.value as 'WEEK' | 'DAY')}
                    className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="WEEK">Semaine</option>
                    <option value="DAY">Jour</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--pp-muted)] block mb-1">Date ancre</label>
                  <input
                    type="date"
                    value={cycleAnchorDate}
                    onChange={e => setCycleAnchorDate(e.target.value)}
                    className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-[var(--pp-muted)] mt-1">Début du cycle pour Phase 0</p>
                </div>
              </div>

              {/* Periods list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[var(--pp-ink)] uppercase tracking-wide">Périodes</h3>
                  <button onClick={addPeriod} className="text-xs px-3 py-1 border border-[var(--pp-info)] text-[var(--pp-info)] rounded hover:bg-[var(--pp-info)]/5">
                    + Ajouter
                  </button>
                </div>

                <div className="space-y-3">
                  {cyclePeriods.map((period, i) => {
                    const days = parseWorkDays(period.workDays)
                    const isRest = !period.shiftType
                    return (
                      <div key={i} className="border border-[var(--pp-line)] rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--pp-muted)]">Période {i + 1}</span>
                          {cyclePeriods.length > 1 && (
                            <button onClick={() => removePeriod(i)} className="text-xs text-red-500 hover:text-red-700">Supprimer</button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs text-[var(--pp-muted)] block mb-1">Nom de la période</label>
                            <input
                              value={period.label}
                              onChange={e => updatePeriod(i, 'label', e.target.value)}
                              placeholder="Matin, Nuit, Repos..."
                              className="w-full border border-[var(--pp-line)] rounded px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--pp-muted)] block mb-1">Type d&apos;horaire</label>
                            <select
                              value={period.shiftType ?? ''}
                              onChange={e => updatePeriod(i, 'shiftType', e.target.value || null)}
                              className="w-full border border-[var(--pp-line)] rounded px-2 py-1.5 text-sm"
                            >
                              <option value="">— Repos —</option>
                              {Object.entries(SHIFT_TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </div>
                          {!isRest && (
                            <>
                              <div>
                                <label className="text-xs text-[var(--pp-muted)] block mb-1">Heure début</label>
                                <input
                                  type="time"
                                  value={period.startTime ?? ''}
                                  onChange={e => updatePeriod(i, 'startTime', e.target.value || null)}
                                  className="w-full border border-[var(--pp-line)] rounded px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-[var(--pp-muted)] block mb-1">Heure fin</label>
                                <input
                                  type="time"
                                  value={period.endTime ?? ''}
                                  onChange={e => updatePeriod(i, 'endTime', e.target.value || null)}
                                  className="w-full border border-[var(--pp-line)] rounded px-2 py-1.5 text-sm"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {!isRest && (
                          <div>
                            <label className="text-xs text-[var(--pp-muted)] block mb-1">Jours travaillés</label>
                            <div className="flex gap-1.5 flex-wrap">
                              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleWorkDay(i, day)}
                                  className={`text-xs px-2.5 py-1 rounded font-medium border transition-colors ${days.includes(day) ? 'bg-[var(--pp-info)] text-white border-[var(--pp-info)]' : 'border-[var(--pp-line)] text-[var(--pp-muted)] hover:border-[var(--pp-info)]'}`}
                                >
                                  {WORK_DAYS_LABELS[day]}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {period.shiftType && SHIFT_TYPE_LABELS[period.shiftType] && (
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${SHIFT_TYPE_LABELS[period.shiftType].color}`}>
                            {SHIFT_TYPE_LABELS[period.shiftType].label}
                          </span>
                        )}
                        {isRest && (
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Repos</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCycleForm(false)} className="px-4 py-2 text-sm border border-[var(--pp-line)] rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  onClick={saveCycle}
                  disabled={savingCycle}
                  className="px-4 py-2 text-sm bg-[var(--pp-info)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {savingCycle ? 'Enregistrement...' : (editingCycleId ? 'Mettre à jour' : 'Créer le cycle')}
                </button>
              </div>
            </div>
          )}

          {/* Cycles list */}
          {cycles.length === 0 && !showCycleForm ? (
            <div className="text-center py-12 text-[var(--pp-muted)]">
              Aucun cycle de rotation créé. Cliquez sur &quot;+ Nouveau cycle&quot; pour commencer.
            </div>
          ) : (
            cycles.map(cycle => (
              <div key={cycle.id} className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--pp-line)] bg-[var(--pp-info)]/5">
                  <div>
                    <span className="font-semibold text-[var(--pp-ink)]">{cycle.name}</span>
                    <span className="text-xs text-[var(--pp-muted)] ml-3">
                      {cycle.periods.length} période{cycle.periods.length !== 1 ? 's' : ''} · par {cycle.periodUnit === 'WEEK' ? 'semaine' : 'jour'}
                    </span>
                    {cycle.teams.length > 0 && (
                      <span className="text-xs text-[var(--pp-muted)] ml-3">
                        Équipes : {cycle.teams.map(t => t.name).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditCycle(cycle)} className="text-xs px-3 py-1 border border-[var(--pp-line)] rounded hover:bg-gray-50">
                      Modifier
                    </button>
                    <button onClick={() => deleteCycle(cycle.id, cycle.name)} className="text-xs px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50">
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[var(--pp-line)]">
                  {cycle.periods.map(p => {
                    const isRest = !p.shiftType
                    const typeInfo = p.shiftType ? SHIFT_TYPE_LABELS[p.shiftType] : null
                    return (
                      <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                        <span className="text-xs font-semibold text-[var(--pp-muted)] w-16 shrink-0">Phase {p.order}</span>
                        <span className="text-sm text-[var(--pp-ink)] min-w-24">{p.label}</span>
                        {typeInfo ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Repos</span>
                        )}
                        {!isRest && p.startTime && p.endTime && (
                          <span className="text-xs text-[var(--pp-muted)]">{p.startTime} – {p.endTime}</span>
                        )}
                        {!isRest && (
                          <div className="flex gap-1 ml-auto">
                            {parseWorkDays(p.workDays).map(d => (
                              <span key={d} className="text-xs px-1.5 py-0.5 bg-[var(--pp-info)]/10 text-[var(--pp-info)] rounded font-medium">
                                {WORK_DAYS_LABELS[d]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
