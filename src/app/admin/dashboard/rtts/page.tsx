'use client'

import { useEffect, useState } from 'react'
import { AdminRequestRow } from '@/components/AdminRequestRow'

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

  const pending = rtts.filter(r => r.status === 'PENDING')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">
        Demandes RTT ({pending.length} en attente)
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
            {rtts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  Aucune demande RTT
                </td>
              </tr>
            ) : (
              rtts.map(rtt => (
                <AdminRequestRow
                  key={rtt.id}
                  id={rtt.id}
                  type="RTT"
                  employee={rtt.userName || 'Inconnu'}
                  email={rtt.userEmail || ''}
                  status={rtt.status}
                  details={`${new Date(rtt.date).toLocaleDateString('fr-BE')} — ${rtt.hoursToRecover}h — ${rtt.reason || 'Pas de raison'}`}
                  disabled={actionInProgress === rtt.id}
                  onApprove={() => handleAction(rtt.id, 'approve')}
                  onReject={() => {
                    const reason = prompt('Raison du rejet:')
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
