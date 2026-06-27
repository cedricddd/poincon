'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { showToast } from '@/hooks/useToast'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

interface RTTRequest {
  id: string
  date: string
  hoursToRecover: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt?: string
  rejectionReason?: string
}

function StatusBadge({ status }: { status: RTTRequest['status'] }) {
  const t = useTranslations('rtt')
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

export default function RTTPage() {
  const t = useTranslations('rtt')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const [requests, setRequests] = useState<RTTRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ date: '', hoursToRecover: '', reason: '' })

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/rtt')
      if (res.ok) setRequests(await res.json())
    } catch {
      showToast(t('toastLoadError'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.date || !formData.hoursToRecover) {
      showToast(t('toastRequired'), 'warning')
      return
    }
    const hours = parseFloat(formData.hoursToRecover)
    if (hours <= 0 || hours > 8) { showToast(t('toastHoursRange'), 'warning'); return }
    if (new Date(formData.date) < new Date(new Date().toDateString())) {
      showToast(t('toastFutureDate'), 'warning'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/rtt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formData.date, hoursToRecover: hours, reason: formData.reason }),
      })
      if (!res.ok) throw new Error()
      showToast(t('toastCreated'), 'success')
      setFormData({ date: '', hoursToRecover: '', reason: '' })
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

  const totalApproved = requests.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.hoursToRecover, 0)

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
            <p className="text-xs text-[var(--pp-muted)]">{t('approvedLabel')}</p>
            <p className="text-2xl font-bold text-[var(--pp-pos)]">{totalApproved.toFixed(1)}h</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Form */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-4">{t('newRequest')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('recoveryDate')}</label>
                  <input type="date" value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3.5 border border-[var(--pp-line)] rounded-xl bg-[var(--pp-bg)] text-[var(--pp-ink)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] touch-manipulation"
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">{t('hoursToRecover')}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.5" min="0.5" max="8"
                      value={formData.hoursToRecover}
                      onChange={e => setFormData({ ...formData, hoursToRecover: e.target.value })}
                      placeholder="Ex: 2"
                      className="flex-1 px-4 py-3.5 border border-[var(--pp-line)] rounded-xl bg-[var(--pp-bg)] text-[var(--pp-ink)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] touch-manipulation"
                      required />
                    <span className="text-sm text-[var(--pp-muted)] font-medium">h</span>
                  </div>
                  <p className="text-xs text-[var(--pp-muted)] mt-1">{t('hoursRange')}</p>
                </div>

                {formData.hoursToRecover && formData.date && (
                  <div className="p-3 rounded-xl bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/20">
                    <p className="text-xs text-[var(--pp-muted)] mb-0.5">{t('preview')}</p>
                    <p className="text-base font-bold text-[var(--pp-pos)]">
                      {fmt(formData.date)} · {parseFloat(formData.hoursToRecover).toFixed(1)}h
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
                <p className="font-semibold text-[var(--pp-ink)] mb-1">{t('howTitle')}</p>
                <p>{t('howBody')}</p>
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
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
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
                          <p className="text-sm font-semibold text-[var(--pp-ink)]">{fmt(req.date)}</p>
                          <p className="text-xs text-[var(--pp-muted)] mt-0.5">
                            {t('recovered', { hours: req.hoursToRecover.toFixed(1) })}
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
