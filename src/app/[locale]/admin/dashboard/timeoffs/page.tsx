'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { AdminRequestRow } from '@/components/AdminRequestRow'
import { showToast } from '@/hooks/useToast'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY'

const LEAVE_TYPE_KEYS: Record<LeaveType, string> = {
  ANNUAL: 'typeAnnual',
  SICK: 'typeSick',
  MATERNITY: 'typeMaternity',
}

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  ANNUAL: 'bg-[var(--pp-pos)]/12 text-[var(--pp-pos)]',
  SICK: 'bg-orange-500/12 text-orange-600 dark:text-orange-400',
  MATERNITY: 'bg-pink-500/12 text-pink-600 dark:text-pink-400',
}

const LEAVE_TYPE_ICONS: Record<LeaveType, React.ReactNode> = {
  ANNUAL: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
    </svg>
  ),
  SICK: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/>
    </svg>
  ),
  MATERNITY: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
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
  const t = useTranslations('adminRequests')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
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
        alert(t('errorPrefix', { msg: error.error }))
      }
    } catch (error) {
      console.error('Action failed:', error)
      alert(t('actionFailed'))
    } finally {
      setActionInProgress(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.userId || !form.startDate || !form.endDate) {
      showToast(t('toastRequired'), 'warning')
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
      showToast(t('toastSaved'), 'success')
      setShowModal(false)
      setForm(EMPTY_FORM)
      await fetchRequests()
    } catch {
      showToast(t('toastSaveError'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">{t('loading')}</div>
  }

  const pending = timeOffs.filter(to => to.status === 'PENDING')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">
          {t('timeoffsTitle')} ({t('pending', { count: pending.length })})
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[var(--pp-pos)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          {t('addLeave')}
        </button>
      </div>

      <div className="overflow-x-auto bg-[var(--pp-bg2)] rounded-lg border border-[var(--pp-line)]">
        <table className="w-full text-left">
          <thead className="bg-[var(--pp-bg)] border-b border-[var(--pp-line)]">
            <tr>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">{t('colType')}</th>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">{t('colEmployee')}</th>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">{t('colDetails')}</th>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">{t('colStatus')}</th>
              <th className="px-4 py-3 text-[var(--pp-muted)] text-sm font-medium">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {timeOffs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-[var(--pp-muted)]">
                  {t('emptyTimeoffs')}
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
                    type={t(LEAVE_TYPE_KEYS[to.leaveType ?? 'ANNUAL'])}
                    typeColor={LEAVE_TYPE_COLORS[to.leaveType ?? 'ANNUAL']}
                    typeIcon={LEAVE_TYPE_ICONS[to.leaveType ?? 'ANNUAL']}
                    employee={to.userName || t('unknown')}
                    email={to.userEmail || ''}
                    status={to.status}
                    details={`${start.toLocaleDateString(bcp)} → ${end.toLocaleDateString(bcp)} (${days}${t('daysSuffix')})${to.reason ? ` — ${to.reason}` : ''}`}
                    disabled={actionInProgress === to.id}
                    onApprove={() => handleAction(to.id, 'approve')}
                    onReject={() => {
                      const reason = prompt(t('rejectPrompt'))
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
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-5">{t('modalTitle')}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('fEmployee')}</label>
                <select
                  value={form.userId}
                  onChange={e => setForm({ ...form, userId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                  required
                >
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name ?? emp.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('fLeaveType')}</label>
                <select
                  value={form.leaveType}
                  onChange={e => setForm({ ...form, leaveType: e.target.value as LeaveType })}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                >
                  <option value="ANNUAL">{t('typeAnnual')}</option>
                  <option value="SICK">{t('typeSick')}</option>
                  <option value="MATERNITY">{t('typeMaternity')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('fFrom')}</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('fTo')}</label>
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
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('fNote')}</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder={t('fNotePlaceholder')}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                />
              </div>
              <p className="text-xs text-[var(--pp-muted)]">{t.rich('autoApproved', { b: (c) => <strong>{c}</strong> })}</p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}
                  className="flex-1 px-4 py-2.5 border border-[var(--pp-line)] rounded-lg text-sm text-[var(--pp-ink)] hover:bg-[var(--pp-bg2)] transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-[var(--pp-pos)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
                >
                  {submitting ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
