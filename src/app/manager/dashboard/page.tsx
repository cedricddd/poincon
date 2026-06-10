'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { showToast } from '@/hooks/useToast'

type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY'
const LEAVE_TYPE_LABELS: Record<LeaveType, string> = { ANNUAL: 'Congé annuel', SICK: 'Congé maladie', MATERNITY: 'Congé maternité' }
const EMPTY_LEAVE_FORM = { userId: '', leaveType: 'SICK' as LeaveType, startDate: '', endDate: '', reason: '' }

interface RequestUser { id: string; name: string | null; email: string }
interface Overtime { id: string; userId: string; date: string; overtimeHours: number; status: string; user: RequestUser }
interface TimeOff { id: string; userId: string; startDate: string; endDate: string; reason?: string; status: string; user: RequestUser }
interface RTT { id: string; userId: string; date: string; hoursToRecover: number; reason?: string; status: string; user: RequestUser }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function ManagerDashboard() {
  const [overtimes, setOvertimes] = useState<Overtime[]>([])
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([])
  const [rtts, setRtts] = useState<RTT[]>([])
  const [upcomingLeaves, setUpcomingLeaves] = useState<TimeOff[]>([])
  const [members, setMembers] = useState<RequestUser[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState(EMPTY_LEAVE_FORM)
  const [submittingLeave, setSubmittingLeave] = useState(false)

  const fetchData = async () => {
    const [reqRes, calRes] = await Promise.all([
      fetch('/api/manager/requests'),
      fetch('/api/manager/team-calendar'),
    ])
    if (reqRes.ok) {
      const data = await reqRes.json()
      setOvertimes(data.overtimes ?? [])
      setTimeOffs(data.timeOffs ?? [])
      setRtts(data.rtts ?? [])
      setMembers(data.members ?? [])
    }
    if (calRes.ok) {
      const data = await calRes.json()
      setUpcomingLeaves(data.timeOffs ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const act = async (type: string, requestId: string, action: 'approve' | 'reject') => {
    setActing(requestId)
    const res = await fetch('/api/manager/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, requestId, action }),
    })
    if (res.ok) {
      showToast(action === 'approve' ? 'Approuvé' : 'Refusé', action === 'approve' ? 'success' : 'error')
      fetchData()
    } else {
      showToast('Erreur', 'error')
    }
    setActing(null)
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const handleLeaveCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveForm.userId || !leaveForm.startDate || !leaveForm.endDate) {
      showToast('Veuillez remplir tous les champs obligatoires', 'warning')
      return
    }
    setSubmittingLeave(true)
    try {
      const res = await fetch('/api/manager/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveForm),
      })
      if (!res.ok) throw new Error()
      showToast('Congé enregistré', 'success')
      setShowLeaveModal(false)
      setLeaveForm(EMPTY_LEAVE_FORM)
      await fetchData()
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error')
    } finally {
      setSubmittingLeave(false)
    }
  }

  const pendingCount = [...overtimes, ...timeOffs, ...rtts].filter(r => r.status === 'PENDING').length

  if (loading) return <div className="p-8 text-center">Chargement...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Dashboard Manager</h1>
        <p className="text-sm text-[var(--pp-muted)] mt-1">
          {pendingCount > 0 ? `${pendingCount} demande${pendingCount > 1 ? 's' : ''} en attente` : 'Aucune demande en attente'}
        </p>
      </div>

      {/* Prochains congés de l'équipe */}
      <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--pp-line)] flex items-center justify-between bg-[var(--pp-info)]/5">
          <h2 className="font-semibold text-[var(--pp-ink)]">Prochains congés — 30 jours</h2>
          <span className="text-xs text-[var(--pp-muted)]">{upcomingLeaves.length} absence{upcomingLeaves.length !== 1 ? 's' : ''}</span>
        </div>
        {upcomingLeaves.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--pp-muted)]">Aucun congé prévu dans les 30 prochains jours.</p>
        ) : (
          <div className="divide-y divide-[var(--pp-line)]">
            {upcomingLeaves.map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-[var(--pp-ink)]">{t.user.name ?? t.user.email}</span>
                  {t.reason && <span className="text-xs text-[var(--pp-muted)] ml-2">— {t.reason}</span>}
                </div>
                <span className="text-xs text-[var(--pp-muted)] shrink-0">
                  {fmtDate(t.startDate)} → {fmtDate(t.endDate)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Heures supplémentaires */}
      <Section title="Heures Supplémentaires" count={overtimes.filter(o => o.status === 'PENDING').length}>
        {overtimes.map(o => (
          <Row key={o.id} user={o.user} status={o.status}
            detail={`${fmtDate(o.date)} — ${o.overtimeHours.toFixed(1)}h sup`}
            onApprove={() => act('overtime', o.id, 'approve')}
            onReject={() => act('overtime', o.id, 'reject')}
            loading={acting === o.id}
          />
        ))}
      </Section>

      {/* Congés */}
      <Section
        title="Demandes de Congé"
        count={timeOffs.filter(t => t.status === 'PENDING').length}
        action={<button onClick={() => setShowLeaveModal(true)} className="text-xs px-3 py-1 bg-[var(--pp-pos)] text-white rounded-lg hover:opacity-90 transition font-medium">+ Ajouter</button>}
      >
        {timeOffs.map(t => (
          <Row key={t.id} user={t.user} status={t.status}
            detail={`${fmtDate(t.startDate)} → ${fmtDate(t.endDate)}${t.reason ? ` — ${t.reason}` : ''}`}
            onApprove={() => act('timeoff', t.id, 'approve')}
            onReject={() => act('timeoff', t.id, 'reject')}
            loading={acting === t.id}
          />
        ))}
      </Section>

      {/* RTT */}
      <Section title="Demandes de récupération" count={rtts.filter(r => r.status === 'PENDING').length}>
        {rtts.map(r => (
          <Row key={r.id} user={r.user} status={r.status}
            detail={`${fmtDate(r.date)} — ${r.hoursToRecover}h${r.reason ? ` — ${r.reason}` : ''}`}
            onApprove={() => act('rtt', r.id, 'approve')}
            onReject={() => act('rtt', r.id, 'reject')}
            loading={acting === r.id}
          />
        ))}
      </Section>

      {/* Modal ajout congé */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--pp-bg)] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-5">Enregistrer un congé</h2>
            <form onSubmit={handleLeaveCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Employé *</label>
                <select
                  value={leaveForm.userId}
                  onChange={e => setLeaveForm({ ...leaveForm, userId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                  required
                >
                  <option value="">Sélectionner un employé…</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Type de congé *</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value as LeaveType })}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                >
                  {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(k => (
                    <option key={k} value={k}>{LEAVE_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Du *</label>
                  <input type="date" value={leaveForm.startDate}
                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Au *</label>
                  <input type="date" value={leaveForm.endDate}
                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                    required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Note (optionnel)</label>
                <input type="text" value={leaveForm.reason}
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="ex: certificat médical reçu"
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]" />
              </div>
              <p className="text-xs text-[var(--pp-muted)]">Le congé sera directement enregistré comme <strong>approuvé</strong>.</p>
              <div className="flex gap-3 pt-1">
                <button type="button"
                  onClick={() => { setShowLeaveModal(false); setLeaveForm(EMPTY_LEAVE_FORM) }}
                  className="flex-1 px-4 py-2.5 border border-[var(--pp-line)] rounded-lg text-sm text-[var(--pp-ink)] hover:bg-[var(--pp-bg2)] transition">
                  Annuler
                </button>
                <button type="submit" disabled={submittingLeave}
                  className="flex-1 px-4 py-2.5 bg-[var(--pp-pos)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60">
                  {submittingLeave ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, count, action, children }: { title: string; count: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--pp-line)] flex items-center justify-between bg-[var(--pp-info)]/5">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-[var(--pp-ink)]">{title}</h2>
          {count > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">{count} en attente</span>
          )}
        </div>
        {action}
      </div>
      <div className="divide-y divide-[var(--pp-line)]">{children}</div>
    </div>
  )
}

function Row({ user, status, detail, onApprove, onReject, loading }: {
  user: RequestUser; status: string; detail: string
  onApprove: () => void; onReject: () => void; loading: boolean
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--pp-ink)] truncate">{user.name ?? user.email}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? ''}`}>{status}</span>
        </div>
        <p className="text-xs text-[var(--pp-muted)] mt-0.5 truncate">{detail}</p>
      </div>
      {status === 'PENDING' && (
        <div className="flex gap-2 shrink-0">
          <button onClick={onApprove} disabled={loading}
            className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-lg hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 disabled:opacity-50">✓</button>
          <button onClick={onReject} disabled={loading}
            className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-700 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50">✗</button>
        </div>
      )}
    </div>
  )
}
