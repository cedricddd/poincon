'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
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
  startDate: string
  endDate: string
  leaveType: LeaveType
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt?: string
  rejectionReason?: string
}

function StatusBadge({ status }: { status: TimeOffRequest['status'] }) {
  const t = useTranslations('timeoff')
  const cfg = {
    APPROVED: { label: t('statusApproved'), bg: 'bg-[var(--pp-pos)]/12',  text: 'text-[var(--pp-pos)]',  dot: 'bg-[var(--pp-pos)]' },
    REJECTED: { label: t('statusRejected'), bg: 'bg-[var(--pp-neg)]/12',  text: 'text-[var(--pp-neg)]',  dot: 'bg-[var(--pp-neg)]' },
    PENDING:  { label: t('statusPending'),  bg: 'bg-[var(--pp-info)]/12', text: 'text-[var(--pp-info)]', dot: 'bg-[var(--pp-info)]' },
  }[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function daysBetween(start: string, end: string) {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

export default function TimeOffPage() {
  const t = useTranslations('timeoff')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ startDate: '', endDate: '', leaveType: 'ANNUAL' as LeaveType, reason: '' })

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/time-off')
      if (res.ok) setRequests(await res.json())
    } catch {
      showToast(t('toastLoadError'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.startDate || !formData.endDate) {
      showToast(t('toastSelectDates'), 'warning'); return
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      showToast(t('toastEndAfterStart'), 'warning'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error()
      showToast(t('toastCreated'), 'success')
      setFormData({ startDate: '', endDate: '', leaveType: 'ANNUAL', reason: '' })
      await loadRequests()
    } catch {
      showToast(t('toastCreateError'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString(bcp, {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

  const totalApproved = requests.filter(r => r.status === 'APPROVED')
    .reduce((s, r) => s + daysBetween(r.startDate, r.endDate), 0)

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-8">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
            <p className="text-sm text-[var(--pp-muted)] mt-0.5">{t('subtitle')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--pp-muted)]">{t('approvedDays')}</p>
            <p className="text-2xl font-bold text-[var(--pp-pos)]">{totalApproved}{t('daysSuffix')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Form */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-4">{t('newRequest')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('leaveType')}</label>
                  <select
                    value={formData.leaveType}
                    onChange={e => setFormData({ ...formData, leaveType: e.target.value as LeaveType })}
                    className="w-full px-4 py-3.5 border border-[var(--pp-line)] rounded-xl bg-[var(--pp-bg)] text-[var(--pp-ink)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
                  >
                    <option value="ANNUAL">{t('typeAnnual')}</option>
                    <option value="SICK">{t('typeSick')}</option>
                    <option value="MATERNITY">{t('typeMaternity')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('startDate')}</label>
                  <input type="date" value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3.5 border border-[var(--pp-line)] rounded-xl bg-[var(--pp-bg)] text-[var(--pp-ink)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] touch-manipulation"
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('endDate')}</label>
                  <input type="date" value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3.5 border border-[var(--pp-line)] rounded-xl bg-[var(--pp-bg)] text-[var(--pp-ink)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] touch-manipulation"
                    required />
                </div>

                {formData.startDate && formData.endDate && (
                  <div className="p-3 rounded-xl bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/20">
                    <p className="text-xs text-[var(--pp-muted)] mb-0.5">{t('duration')}</p>
                    <p className="text-base font-bold text-[var(--pp-pos)]">
                      {t('days', { count: daysBetween(formData.startDate, formData.endDate) })}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('reason')}</label>
                  <textarea value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder={t('reasonPlaceholder')}
                    className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] resize-none"
                    rows={3} />
                </div>

                <Button type="submit" disabled={submitting} className="w-full"
                  style={{ backgroundColor: 'var(--pp-pos)', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? t('submitting') : t('submit')}
                </Button>
              </form>

              <div className="mt-5 p-3 rounded-xl bg-[var(--pp-bg2)] text-xs text-[var(--pp-muted)]">
                <p className="font-semibold text-[var(--pp-ink)] mb-1">{t('infoTitle')}</p>
                <p>{t('infoBody')}</p>
              </div>
            </Card>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-4">{t('myRequests')}</h2>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="pp-skel h-16" />)}
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-[var(--pp-line)] flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--pp-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <p className="text-[var(--pp-muted)] font-medium">{t('empty')}</p>
                  <p className="text-xs text-[var(--pp-muted)] mt-1">{t('emptyHint')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map(req => (
                    <div key={req.id} className="p-4 rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] hover:border-[var(--pp-info)]/30 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${LEAVE_TYPE_COLORS[req.leaveType ?? 'ANNUAL']}`}>
                              {LEAVE_TYPE_ICONS[req.leaveType ?? 'ANNUAL']}
                              {t(LEAVE_TYPE_KEYS[req.leaveType ?? 'ANNUAL'])}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[var(--pp-ink)]">
                            {fmt(req.startDate)} → {fmt(req.endDate)}
                          </p>
                          <p className="text-xs text-[var(--pp-muted)] mt-0.5">
                            {t('days', { count: daysBetween(req.startDate, req.endDate) })}
                          </p>
                          {req.reason && <p className="text-xs text-[var(--pp-muted)] mt-1 italic">« {req.reason} »</p>}
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                      {req.status === 'REJECTED' && req.rejectionReason && (
                        <div className="mt-3 p-2.5 rounded-lg bg-[var(--pp-neg)]/8 text-xs text-[var(--pp-neg)]">
                          <span className="font-medium">{t('rejectionLabel')}</span>{req.rejectionReason}
                        </div>
                      )}
                      {req.status === 'APPROVED' && req.approvedAt && (
                        <p className="mt-2 text-xs text-[var(--pp-muted)]">{t('approvedOn', { date: fmt(req.approvedAt) })}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
