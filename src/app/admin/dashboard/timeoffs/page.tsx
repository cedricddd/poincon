'use client'

import { useEffect, useState } from 'react'
import { AdminRequestRow } from '@/components/AdminRequestRow'

interface TimeOffRequest {
  id: string
  userId: string
  startDate: string
  endDate: string
  reason?: string
  status: string
  userName?: string
  userEmail?: string
}

export default function TimeoffsPage() {
  const [timeOffs, setTimeOffs] = useState<TimeOffRequest[]>([])
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
        setTimeOffs(data.timeOffs || [])
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
          type: 'timeoff',
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

  const pending = timeOffs.filter(t => t.status === 'PENDING')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">
        Demandes de Congé ({pending.length} en attente)
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
            {timeOffs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  Aucune demande de congé
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
                    type="Congé"
                    employee={to.userName || 'Inconnu'}
                    email={to.userEmail || ''}
                    status={to.status}
                    details={`${start.toLocaleDateString('fr-BE')} → ${end.toLocaleDateString('fr-BE')} (${days}j) — ${to.reason || 'Pas de raison'}`}
                    disabled={actionInProgress === to.id}
                    onApprove={() => handleAction(to.id, 'approve')}
                    onReject={() => {
                      const reason = prompt('Raison du rejet:')
                      if (reason) handleAction(to.id, 'reject', reason)
                    }}
                  />
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
