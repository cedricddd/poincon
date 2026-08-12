'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { AdminRequestRow } from '@/components/AdminRequestRow'
import { showToast } from '@/hooks/useToast'
import { LEAVE_TYPES, LEAVE_TYPE_KEY_TYPE_PREFIX, LEAVE_TYPE_COLOR_CLASSES, type LeaveType } from '@/lib/leaveTypes'
import { LeaveTypeIcon } from '@/components/LeaveTypeIcon'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

const LEAVE_TYPE_KEYS = LEAVE_TYPE_KEY_TYPE_PREFIX
const LEAVE_TYPE_COLORS = LEAVE_TYPE_COLOR_CLASSES

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

const EMPTY_FORM = { employeeIds: [] as string[], leaveType: 'SICK' as LeaveType, startDate: '', endDate: '', reason: '' }

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingEmployeeLabel, setEditingEmployeeLabel] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkEndDate, setBulkEndDate] = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)

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

  const closeModal = () => {
    setShowModal(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setEditingEmployeeLabel('')
  }

  const openEdit = (to: TimeOffRequest) => {
    setEditingId(to.id)
    setEditingEmployeeLabel(to.userName || t('unknown'))
    setForm({
      employeeIds: [to.userId],
      leaveType: to.leaveType ?? 'ANNUAL',
      startDate: to.startDate.slice(0, 10),
      endDate: to.endDate.slice(0, 10),
      reason: to.reason ?? '',
    })
    setShowModal(true)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev => (prev.size === timeOffs.length ? new Set() : new Set(timeOffs.map(to => to.id))))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleBulkShorten = async () => {
    if (!bulkEndDate || selectedIds.size === 0) return
    setBulkApplying(true)
    try {
      const targets = timeOffs.filter(to => selectedIds.has(to.id))
      const results = await Promise.allSettled(
        targets.map(to =>
          fetch(`/api/admin/time-off/${to.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startDate: to.startDate.slice(0, 10),
              endDate: bulkEndDate,
              leaveType: to.leaveType,
              reason: to.reason,
            }),
          })
        )
      )
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length
      if (failed > 0) showToast(t('toastBulkPartialError', { count: failed }), 'warning')
      else showToast(t('toastBulkUpdated'), 'success')
      clearSelection()
      setBulkEndDate('')
      await fetchRequests()
    } finally {
      setBulkApplying(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    try {
      setActionInProgress(id)
      const res = await fetch(`/api/admin/time-off/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showToast(t('toastDeleted'), 'success')
      await fetchRequests()
    } catch {
      showToast(t('toastDeleteError'), 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.employeeIds.length === 0 || !form.startDate || !form.endDate) {
      showToast(t('toastRequired'), 'warning')
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/time-off/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: form.startDate, endDate: form.endDate, leaveType: form.leaveType, reason: form.reason }),
        })
        if (!res.ok) throw new Error()
        showToast(t('toastUpdated'), 'success')
      } else {
        const results = await Promise.allSettled(
          form.employeeIds.map(userId =>
            fetch('/api/admin/time-off', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, leaveType: form.leaveType, startDate: form.startDate, endDate: form.endDate, reason: form.reason }),
            })
          )
        )
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length
        if (failed === form.employeeIds.length) throw new Error()
        showToast(failed > 0 ? t('toastSaveErrorPartial', { count: failed }) : t('toastSaved'), failed > 0 ? 'warning' : 'success')
      }
      closeModal()
      await fetchRequests()
    } catch {
      showToast(editingId ? t('toastUpdateError') : t('toastSaveError'), 'error')
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
          className="px-4 py-2 bg-[var(--pp-pos-btn)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          {t('addLeave')}
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-lg px-4 py-3">
          <span className="text-sm font-medium">{t('bulkSelected', { count: selectedIds.size })}</span>
          <label className="flex items-center gap-2 text-sm text-[var(--pp-muted)]">
            {t('bulkEndDateLabel')}
            <input
              type="date"
              value={bulkEndDate}
              onChange={e => setBulkEndDate(e.target.value)}
              className="px-2 py-1.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
            />
          </label>
          <button
            onClick={handleBulkShorten}
            disabled={!bulkEndDate || bulkApplying}
            className="px-3 py-1.5 bg-[var(--pp-pos-btn)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {bulkApplying ? t('bulkApplying') : t('bulkApply')}
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 border border-[var(--pp-line)] rounded-lg text-sm text-[var(--pp-ink)] hover:bg-[var(--pp-bg)] transition"
          >
            {t('bulkClear')}
          </button>
        </div>
      )}

      <div className="overflow-x-auto bg-[var(--pp-bg2)] rounded-lg border border-[var(--pp-line)]">
        <table className="w-full text-left">
          <thead className="bg-[var(--pp-bg)] border-b border-[var(--pp-line)]">
            <tr>
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={timeOffs.length > 0 && selectedIds.size === timeOffs.length}
                  onChange={toggleSelectAll}
                  aria-label={t('selectAll')}
                  className="h-4 w-4 cursor-pointer"
                />
              </th>
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
                <td colSpan={6} className="px-4 py-4 text-center text-[var(--pp-muted)]">
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
                    typeIcon={<LeaveTypeIcon type={to.leaveType ?? 'ANNUAL'} />}
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
                    onEdit={() => openEdit(to)}
                    onDelete={() => handleDelete(to.id)}
                    selected={selectedIds.has(to.id)}
                    onToggleSelect={() => toggleSelect(to.id)}
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
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-5">{editingId ? t('editModalTitle') : t('modalTitle')}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                {editingId ? (
                  <>
                    <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('fEmployee')}</label>
                    <input
                      type="text"
                      value={editingEmployeeLabel}
                      disabled
                      className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm disabled:opacity-60"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide">{t('fEmployees')}</label>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, employeeIds: f.employeeIds.length === employees.length ? [] : employees.map(e => e.id) }))}
                        className="text-xs text-[var(--pp-pos)] hover:underline"
                      >
                        {form.employeeIds.length === employees.length ? t('deselectAllEmployees') : t('selectAllEmployees')}
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-[var(--pp-line)] rounded-lg p-2 space-y-0.5">
                      {employees.map(emp => (
                        <label key={emp.id} className="flex items-center gap-2 text-sm px-1.5 py-1 rounded hover:bg-[var(--pp-bg2)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.employeeIds.includes(emp.id)}
                            onChange={e =>
                              setForm(f => ({
                                ...f,
                                employeeIds: e.target.checked
                                  ? [...f.employeeIds, emp.id]
                                  : f.employeeIds.filter(id => id !== emp.id),
                              }))
                            }
                            className="h-4 w-4 cursor-pointer"
                          />
                          {emp.name ?? emp.email}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('fLeaveType')}</label>
                <select
                  value={form.leaveType}
                  onChange={e => setForm({ ...form, leaveType: e.target.value as LeaveType })}
                  className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                >
                  {LEAVE_TYPES.map(lt => (
                    <option key={lt} value={lt}>{t(LEAVE_TYPE_KEYS[lt])}</option>
                  ))}
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
              {!editingId && (
                <p className="text-xs text-[var(--pp-muted)]">{t.rich('autoApproved', { b: (c) => <strong>{c}</strong> })}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-[var(--pp-line)] rounded-lg text-sm text-[var(--pp-ink)] hover:bg-[var(--pp-bg2)] transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-[var(--pp-pos-btn)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
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
