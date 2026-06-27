'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { AdminRequestRow } from '@/components/AdminRequestRow'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

interface RTTRequest {
  id: string
  userId: string
  date: string
  hoursToRecover: number
  reason?: string
  status: string
  userName?: string
  userEmail?: string
}

export default function RttsPage() {
  const t = useTranslations('adminRequests')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const [rtts, setRtts] = useState<RTTRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/requests')
      if (res.ok) {
        const data = await res.json()
        setRtts(data.rtts || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (
    requestId: string,
    action: 'approve' | 'reject',
    reason?: string
  ) => {
    try {
      setActionInProgress(requestId)
      const res = await fetch('/api/admin/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rtt',
          requestId,
          action,
          rejectionReason: action === 'reject' ? reason : undefined,
        }),
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

  if (loading) {
    return <div className="p-8 text-center">{t('loading')}</div>
  }

  const pending = rtts.filter(r => r.status === 'PENDING')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">
        {t('rttsTitle')} ({t('pending', { count: pending.length })})
      </h1>
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
            {rtts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-[var(--pp-muted)]">
                  {t('emptyRtts')}
                </td>
              </tr>
            ) : (
              rtts.map(rtt => (
                <AdminRequestRow
                  key={rtt.id}
                  id={rtt.id}
                  type={t('typeRtt')}
                  employee={rtt.userName || t('unknown')}
                  email={rtt.userEmail || ''}
                  status={rtt.status}
                  details={t('rttDetails', { date: new Date(rtt.date).toLocaleDateString(bcp), hours: rtt.hoursToRecover, reason: rtt.reason || t('noReason') })}
                  disabled={actionInProgress === rtt.id}
                  onApprove={() => handleAction(rtt.id, 'approve')}
                  onReject={() => {
                    const reason = prompt(t('rejectPrompt'))
                    if (reason) handleAction(rtt.id, 'reject', reason)
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
