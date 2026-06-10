'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { AdminRequestRow } from '@/components/AdminRequestRow'
import { showToast } from '@/hooks/useToast'

type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY'

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: 'Congé annuel',
  SICK: 'Congé maladie',
  MATERNITY: 'Congé maternité',
}

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  ANNUAL: 'bg-[var(--pp-pos)]/12 text-[var(--pp-pos)]',
  SICK: 'bg-orange-500/12 text-orange-600 dark:text-orange-400',
  MATERNITY: 'bg-pink-500/12 text-pink-600 dark:text-pink-400',
}

interface TimeOffRequest {
  id: string
  userId: string
  startDate: string
  endDate: string
  leaveType?: LeaveType
  reason?: string
  status: string
  userName?: string
  userEmail?: string
}

interface Employee { id: string; name: string | null; email: string }

const EMPTY_FORM = { userId: '', leaveType: 'SICK' as LeaveType, startDate: '', endDate: '', reason: '' }

export default function TimeoffsPage() {
  const [timeOffs, setTimeOffs] = useState<TimeOffRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchRequests()
    fetchEmployees()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/requests')
      if (res.ok) {
        const data = await res.json()
        setTimeOffs(data.timeOffs || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.users ?? data ?? [])
      }
    } catch { /* silent */ }
  }

  const handleAction = async (requestId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      setActionInProgress(requestId)
      const res = await fetch('/api/admin/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'timeoff', requestId, action, rejectionReason: action === 'reject' ? reason : undefined }),
      })
      if (res.ok) {
        await fetchRequests()
      } else {
        const error = await res.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Action failed:', error)
      alert('Action échouée')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.userId || !form.startDate || !form.endDate) {
      showToast('Veuillez remplir tous les champs obligatoires', 'warning')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      showToast('Congé enregistré', 'success')
      setShowModal(false)
      setForm(EMPTY_FORM)
      await fetchRequests()
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>
  }

  const pending = timeOffs.filter(t => t.status === 'PENDING')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">
          Demandes de Congé ({pending.length} en attente)
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[var(--pp-pos)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          + Ajouter un congé
        </button>
      </div>

      <div className="overflow-x-auto bg-[var(--pp-bg2)] rounded-lg border border-[var(--pp-line)]">
        <table className="w-full text-left">
          <thead className="bg-[var(--pp-bg)] border-b border-[var(--pp-line)]">
            <tr>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">Type</th>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">Employé</th>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">Détails</th>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">Statut</th>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {timeOffs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-[var(--pp-muted)]">
                  Aucune demande de congé
                </td>
              </tr>
            ) : (
              timeOffs.map(to => {
                const start = new Date(to.startDate)
                const end = new Date(to.endDate)
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                return (
                  <AdminRequestRow
                    key={to.id}
                    id={to.id}
                    type={LEAVE_TYPE_LABELS[to.leaveType ?? 'ANNUAL']}
                    typeColor={LEAVE_TYPE_COLORS[to.leaveType ?? 'ANNUAL']}
                    employee={to.userName || 'Inconnu'}
                    email={to.userEmail || ''}
                    status={to.status}
                    details={`${start.toLocaleDateString('fr-BE')} → ${end.toLocaleDateString('fr-BE')} (${days}j)${to.reason ? ` — ${to.reason}` : ''}`}
                    disabled={actionInProgress === to.id}
                    onApprove={() => handleAction(to.id, 'approve')}
                    onReject={() => {
                      const reason = prompt('Raison du rejet:')
                      if (reason) handleAction(to.id, 'reject', reason)
                    }}
                  />
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal ajout congé */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--pp-bg)] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-5">Enregistrer un congé</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Employé *</label>
                <select
                  value={form.userId}
                  onChange={e => setForm({ ...form, userId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                  required
                >
                  <option value="">Sélectionner un employé…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name ?? emp.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Type de congé *</label>
                <select
                  value={form.leaveType}
                  onChange={e => setForm({ ...form, leaveType: e.target.value as LeaveType })}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                >
                  <option value="ANNUAL">Congé annuel</option>
                  <option value="SICK">Congé maladie</option>
                  <option value="MATERNITY">Congé maternité</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Du *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Au *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Note (optionnel)</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="ex: certificat médical reçu"
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                />
              </div>
              <p className="text-xs text-[var(--pp-muted)]">Le congé sera directement enregistré comme <strong>approuvé</strong>.</p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}
                  className="flex-1 px-4 py-2.5 border border-[var(--pp-line)] rounded-lg text-sm text-[var(--pp-ink)] hover:bg-[var(--pp-bg2)] transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-[var(--pp-pos)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
                >
                  {submitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
