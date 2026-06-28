'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { showToast } from '@/hooks/useToast'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY'
const LEAVE_TYPE_KEY: Record<LeaveType, string> = { ANNUAL: 'leaveAnnual', SICK: 'leaveSick', MATERNITY: 'leaveMaternity' }
const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  ANNUAL: 'bg-[var(--pp-pos)]/12 text-[var(--pp-pos)]',
  SICK: 'bg-orange-500/12 text-orange-600 dark:text-orange-400',
  MATERNITY: 'bg-pink-500/12 text-pink-600 dark:text-pink-400',
}
const LEAVE_TYPE_ICONS: Record<LeaveType, React.ReactNode> = {
  ANNUAL: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
    </svg>
  ),
  SICK: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/>
    </svg>
  ),
  MATERNITY: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
}
const EMPTY_LEAVE_FORM = { userId: '', leaveType: 'SICK' as LeaveType, startDate: '', endDate: '', reason: '' }

interface RequestUser { id: string; name: string | null; email: string }
interface Overtime { id: string; userId: string; date: string; overtimeHours: number; status: string; user: RequestUser }
interface TimeOff { id: string; userId: string; startDate: string; endDate: string; leaveType?: LeaveType; reason?: string; status: string; user: RequestUser }
interface RTT { id: string; userId: string; date: string; hoursToRecover: number; reason?: string; status: string; user: RequestUser }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}
const STATUS_KEY: Record<string, string> = { PENDING: 'statusPending', APPROVED: 'statusApproved', REJECTED: 'statusRejected' }

export default function ManagerDashboard() {
  const t = useTranslations('manager')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
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
      showToast(action === 'approve' ? t('approved') : t('rejected'), action === 'approve' ? 'success' : 'error')
      fetchData()
    } else {
      showToast(t('error'), 'error')
    }
    setActing(null)
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(bcp, { day: '2-digit', month: '2-digit', year: 'numeric' })

  const handleLeaveCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveForm.userId || !leaveForm.startDate || !leaveForm.endDate) {
      showToast(t('fillRequired'), 'warning')
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
      showToast(t('leaveSaved'), 'success')
      setShowLeaveModal(false)
      setLeaveForm(EMPTY_LEAVE_FORM)
      await fetchData()
    } catch {
      showToast(t('saveError'), 'error')
    } finally {
      setSubmittingLeave(false)
    }
  }

  const pendingCount = [...overtimes, ...timeOffs, ...rtts].filter(r => r.status === 'PENDING').length

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
        <p className="text-sm text-[var(--pp-muted)] mt-1">
          {t('pendingSummary', { count: pendingCount })}
        </p>
      </div>

      {/* Prochains congés de l'équipe */}
      <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--pp-line)] flex items-center justify-between bg-[var(--pp-info)]/5">
          <h2 className="font-semibold text-[var(--pp-ink)]">{t('upcomingTitle')}</h2>
          <span className="text-xs text-[var(--pp-muted)]">{t('absencesCount', { count: upcomingLeaves.length })}</span>
        </div>
        {upcomingLeaves.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--pp-muted)]">{t('noUpcoming')}</p>
        ) : (
          <div className="divide-y divide-[var(--pp-line)]">
            {upcomingLeaves.map(lv => (
              <div key={lv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-[var(--pp-ink)]">{lv.user.name ?? lv.user.email}</span>
                  {lv.reason && <span className="text-xs text-[var(--pp-muted)] ml-2">— {lv.reason}</span>}
                </div>
                <span className="text-xs text-[var(--pp-muted)] shrink-0">
                  {fmtDate(lv.startDate)} → {fmtDate(lv.endDate)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Heures supplémentaires */}
      <Section title={t('sectionOvertimes')} count={overtimes.filter(o => o.status === 'PENDING').length}>
        {overtimes.map(o => (
          <Row key={o.id} user={o.user} status={o.status}
            detail={t('overtimeDetail', { date: fmtDate(o.date), hours: o.overtimeHours.toFixed(1) })}
            onApprove={() => act('overtime', o.id, 'approve')}
            onReject={() => act('overtime', o.id, 'reject')}
            loading={acting === o.id}
          />
        ))}
      </Section>

      {/* Congés */}
      <Section
        title={t('sectionTimeOffs')}
        count={timeOffs.filter(to => to.status === 'PENDING').length}
        action={<button onClick={() => setShowLeaveModal(true)} className="text-xs px-3 py-1 bg-[var(--pp-pos)] text-white rounded-lg hover:opacity-90 transition font-medium">{t('add')}</button>}
      >
        {timeOffs.map(to => {
          const lt = (to.leaveType ?? 'ANNUAL') as LeaveType
          return (
            <Row key={to.id} user={to.user} status={to.status}
              badge={
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${LEAVE_TYPE_COLORS[lt]}`}>
                  {LEAVE_TYPE_ICONS[lt]}{t(LEAVE_TYPE_KEY[lt])}
                </span>
              }
              detail={`${fmtDate(to.startDate)} → ${fmtDate(to.endDate)}${to.reason ? ` — ${to.reason}` : ''}`}
              onApprove={() => act('timeoff', to.id, 'approve')}
              onReject={() => act('timeoff', to.id, 'reject')}
              loading={acting === to.id}
            />
          )
        })}
      </Section>

      {/* RTT */}
      <Section title={t('sectionRtt')} count={rtts.filter(r => r.status === 'PENDING').length}>
        {rtts.map(r => (
          <Row key={r.id} user={r.user} status={r.status}
            detail={`${t('rttDetail', { date: fmtDate(r.date), hours: r.hoursToRecover })}${r.reason ? ` — ${r.reason}` : ''}`}
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
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-5">{t('modalTitle')}</h2>
            <form onSubmit={handleLeaveCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('employeeLabel')}</label>
                <select
                  value={leaveForm.userId}
                  onChange={e => setLeaveForm({ ...leaveForm, userId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                  required
                >
                  <option value="">{t('selectEmployee')}</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('leaveTypeLabel')}</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value as LeaveType })}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                >
                  {(Object.keys(LEAVE_TYPE_KEY) as LeaveType[]).map(k => (
                    <option key={k} value={k}>{t(LEAVE_TYPE_KEY[k])}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('fromLabel')}</label>
                  <input type="date" value={leaveForm.startDate}
                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('toLabel')}</label>
                  <input type="date" value={leaveForm.endDate}
                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                    required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('noteLabel')}</label>
                <input type="text" value={leaveForm.reason}
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder={t('notePlaceholder')}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]" />
              </div>
              <p className="text-xs text-[var(--pp-muted)]">{t.rich('autoApproved', { b: (c) => <strong>{c}</strong> })}</p>
              <div className="flex gap-3 pt-1">
                <button type="button"
                  onClick={() => { setShowLeaveModal(false); setLeaveForm(EMPTY_LEAVE_FORM) }}
                  className="flex-1 px-4 py-2.5 border border-[var(--pp-line)] rounded-lg text-sm text-[var(--pp-ink)] hover:bg-[var(--pp-bg2)] transition">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={submittingLeave}
                  className="flex-1 px-4 py-2.5 bg-[var(--pp-pos)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60">
                  {submittingLeave ? t('saving') : t('save')}
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
  const t = useTranslations('manager')
  return (
    <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--pp-line)] flex items-center justify-between bg-[var(--pp-info)]/5">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-[var(--pp-ink)]">{title}</h2>
          {count > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">{t('pendingBadge', { count })}</span>
          )}
        </div>
        {action}
      </div>
      <div className="divide-y divide-[var(--pp-line)]">{children}</div>
    </div>
  )
}

function Row({ user, status, detail, badge, onApprove, onReject, loading }: {
  user: RequestUser; status: string; detail: string; badge?: React.ReactNode
  onApprove: () => void; onReject: () => void; loading: boolean
}) {
  const t = useTranslations('manager')
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--pp-ink)] truncate">{user.name ?? user.email}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? ''}`}>{STATUS_KEY[status] ? t(STATUS_KEY[status]) : status}</span>
          {badge}
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
