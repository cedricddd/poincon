'use client'

export const dynamic = 'force-dynamic'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { AdminRequestRow } from '@/components/AdminRequestRow'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

const REASON_KEY: Record<string, string> = {
  forgot_clockin: 'reasonForgotIn',
  forgot_clockout: 'reasonForgotOut',
  correction: 'reasonCorrection',
  other: 'reasonOther',
}

interface CorrectionRequest {
  id: string
  userId: string
  date: string
  requestedArrival: string | null
  requestedDeparture: string | null
  reason: string
  note: string | null
  status: string
  rejectionReason: string | null
  user: { id: string; name: string | null; email: string }
  clockRecord: { id: string; arrivalTime: string; departureTime: string | null } | null
}

export default function CorrectionsPage() {
  const t = useTranslations('adminRequests')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const [requests, setRequests] = useState<CorrectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/clock-corrections')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Failed to fetch corrections:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    try {
      setActionInProgress(id)
      const res = await fetch('/api/admin/clock-corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, rejectionReason }),
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

  const hhmm = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString(bcp, { hour: '2-digit', minute: '2-digit' }) : '—'

  /** « 12/08/2026 · 08:00 → 17:30 (actuellement 08:00 → —) · Oubli de sortie · remarque » */
  const details = (c: CorrectionRequest) => {
    const asked = `${hhmm(c.requestedArrival ?? c.clockRecord?.arrivalTime ?? null)} → ${hhmm(c.requestedDeparture ?? c.clockRecord?.departureTime ?? null)}`
    const parts = [
      new Date(c.date).toLocaleDateString(bcp),
      asked,
      c.clockRecord
        ? t('correctionCurrent', { current: `${hhmm(c.clockRecord.arrivalTime)} → ${hhmm(c.clockRecord.departureTime)}` })
        : t('correctionNoRecord'),
      t(REASON_KEY[c.reason] ?? 'reasonCorrection'),
    ]
    if (c.note) parts.push(`« ${c.note} »`)
    return parts.join(' · ')
  }

  if (loading) {
    return <div className="p-8 text-center">{t('loading')}</div>
  }

  const pending = requests.filter(r => r.status === 'PENDING')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">
        {t('correctionsTitle')} ({t('pending', { count: pending.length })})
      </h1>
      <p className="text-sm text-[var(--pp-muted)] mb-8">{t('correctionsHint')}</p>
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
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-[var(--pp-muted)]">
                  {t('emptyCorrections')}
                </td>
              </tr>
            ) : (
              requests.map(c => (
                <AdminRequestRow
                  key={c.id}
                  id={c.id}
                  type={t('typeCorrection')}
                  employee={c.user.name || t('unknown')}
                  email={c.user.email}
                  status={c.status}
                  details={details(c)}
                  disabled={actionInProgress === c.id}
                  onApprove={() => handleAction(c.id, 'APPROVED')}
                  onReject={() => {
                    const reason = prompt(t('rejectPrompt'))
                    if (reason) handleAction(c.id, 'REJECTED', reason)
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
