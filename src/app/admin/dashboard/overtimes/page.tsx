'use client'

import { useEffect, useState } from 'react'
import { AdminRequestRow } from '@/components/AdminRequestRow'

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
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Action failed:', error)
      alert('Action échouée')
    } finally {
      setActionInProgress(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>
  }

  const pending = overtimes.filter(o => o.status === 'PENDING')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">
        Heures Supplémentaires ({pending.length} en attente)
      </h1>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Employé</th>
              <th className="px-4 py-3">Détails</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {overtimes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  Aucune demande d&apos;heures supplémentaires
                </td>
              </tr>
            ) : (
              overtimes.map(ot => (
                <AdminRequestRow
                  key={ot.id}
                  id={ot.id}
                  type="Heures Sup"
                  employee={ot.userName || 'Inconnu'}
                  email={ot.userEmail || ''}
                  status={ot.status}
                  details={`${new Date(ot.date).toLocaleDateString('fr-BE')} — ${ot.overtimeHours}h (${ot.hoursWorked}h travaillées, ${ot.hoursStandard}h standard)`}
                  disabled={actionInProgress === ot.id}
                  onApprove={() => handleAction(ot.id, 'approve')}
                  onReject={() => {
                    const reason = prompt('Raison du rejet:')
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
