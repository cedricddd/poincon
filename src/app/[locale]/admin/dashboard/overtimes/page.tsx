'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { AdminRequestRow } from '@/components/AdminRequestRow'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

interface DetectedOvertime {
  id: string
  userId: string
  date: string
  hoursWorked: number
  hoursStandard: number
  overtimeHours: number
  status: string
  userName?: string
  userEmail?: string
}

export default function OvertimesPage() {
  const t = useTranslations('adminRequests')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const [overtimes, setOvertimes] = useState<DetectedOvertime[]>([])
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
        setOvertimes(data.overtimes || [])
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
          type: 'overtime',
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

  const pending = overtimes.filter(o => o.status === 'PENDING')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">
        {t('overtimesTitle')} ({t('pending', { count: pending.length })})
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
            {overtimes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-[var(--pp-muted)]">
                  {t('emptyOvertimes')}
                </td>
              </tr>
            ) : (
              overtimes.map(ot => (
                <AdminRequestRow
                  key={ot.id}
                  id={ot.id}
                  type={t('typeOvertime')}
                  employee={ot.userName || t('unknown')}
                  email={ot.userEmail || ''}
                  status={ot.status}
                  details={t('overtimeDetails', { date: new Date(ot.date).toLocaleDateString(bcp), hours: ot.overtimeHours, worked: ot.hoursWorked, std: ot.hoursStandard })}
                  disabled={actionInProgress === ot.id}
                  onApprove={() => handleAction(ot.id, 'approve')}
                  onReject={() => {
                    const reason = prompt(t('rejectPrompt'))
                    if (reason) handleAction(ot.id, 'reject', reason)
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
