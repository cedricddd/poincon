'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { showToast } from '@/hooks/useToast'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeBanner } from '@/components/UpgradeBanner'

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
}

interface User {
  id: string
  name: string | null
  email: string
  role: string
}

export default function TeamsPage() {
  const { planInfo, upgradeTo } = usePlan()
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const fetchData = async () => {
    const [teamsRes, usersRes] = await Promise.all([
      fetch('/api/admin/teams'),
      fetch('/api/admin/users'),
    ])
    if (teamsRes.ok) setTeams((await teamsRes.json()).teams ?? [])
    if (usersRes.ok) setUsers((await usersRes.json()).users ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const createTeam = async () => {
    if (!newTeamName.trim()) return
    setCreating(true)
    const res = await fetch('/api/admin/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName.trim() }),
    })
    if (res.ok) {
      setNewTeamName('')
      fetchData()
      showToast('Équipe créée', 'success')
    } else {
      const data = await res.json()
      showToast(data.error ?? 'Erreur', 'error')
    }
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

  if (loading) return <div className="p-8 text-center">Chargement...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Gestion des Équipes</h1>
        <p className="text-sm text-[var(--pp-muted)] mt-1">Créez des équipes et assignez des membres et managers.</p>
      </div>

      {planInfo && !planInfo.canTeams && (
        <UpgradeBanner
          currentPlan={planInfo.plan}
          upgradeTo="TEAM"
          feature="Gestion des équipes"
          description="Les équipes permettent de grouper vos employés et d'assigner des managers. Disponible à partir du plan TEAM."
          variant="mauve"
        />
      )}

      {/* Créer une équipe */}
      <div className={`bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5 ${planInfo && !planInfo.canTeams ? 'opacity-40 pointer-events-none select-none' : ''}`}>
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

      {/* Liste des équipes */}
      {teams.length === 0 ? (
        <div className="text-center py-12 text-[var(--pp-muted)]">Aucune équipe créée.</div>
      ) : (
        <div className="space-y-5">
          {teams.map(team => {
            const memberIds = new Set(team.members.map(m => m.userId))
            const available = users.filter(u => !memberIds.has(u.id))

            return (
              <div key={team.id} className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
                {/* Header équipe */}
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
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[var(--pp-ink)]">{team.name}</span>
                      <span className="text-xs text-[var(--pp-muted)]">{team.members.length} membre{team.members.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingId(team.id); setEditName(team.name) }}
                      className="text-xs px-3 py-1 border border-[var(--pp-line)] rounded hover:bg-gray-50"
                    >
                      Renommer
                    </button>
                    <button
                      onClick={() => deleteTeam(team.id, team.name)}
                      className="text-xs px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {/* Membres */}
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
                          <button
                            onClick={() => addMember(team.id, m.userId, 'manager')}
                            className="text-xs px-2 py-1 border border-[var(--pp-info)] text-[var(--pp-info)] rounded hover:bg-[var(--pp-info)]/5"
                          >
                            → Manager
                          </button>
                        )}
                        <button
                          onClick={() => removeMember(team.id, m.userId)}
                          className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Ajouter un membre */}
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
          })}
        </div>
      )}
    </div>
  )
}
