'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

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

const statusColors: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [overtimes, setOvertimes] = useState<DetectedOvertime[]>([])
  const [timeOffs, setTimeOffs] = useState<TimeOffRequest[]>([])
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
        setOvertimes(data.overtimes || [])
        setTimeOffs(data.timeOffs || [])
        setRtts(data.rtts || [])
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (
    type: 'overtime' | 'timeoff' | 'rtt',
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
          type,
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

  const RequestRow = ({
    id,
    type,
    employee,
    email,
    status,
    details,
    onApprove,
    onReject,
  }: {
    id: string
    type: string
    employee: string
    email: string
    status: string
    details: string
    onApprove: () => void
    onReject: () => void
  }) => (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3">{type}</td>
      <td className="px-4 py-3">
        <div>
          <div className="font-medium">{employee}</div>
          <div className="text-sm text-gray-500">{email}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">{details}</td>
      <td className="px-4 py-3">
        <span className={`px-3 py-1 rounded-full text-sm ${statusColors[status] || 'bg-gray-100'}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={actionInProgress === id || status !== 'PENDING'}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
          >
            ✓
          </button>
          <button
            onClick={onReject}
            disabled={actionInProgress === id || status !== 'PENDING'}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
          >
            ✗
          </button>
        </div>
      </td>
    </tr>
  )

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>
  }

  const pendingOvertimes = overtimes.filter(o => o.status === 'PENDING')
  const pendingTimeOffs = timeOffs.filter(t => t.status === 'PENDING')
  const pendingRtts = rtts.filter(r => r.status === 'PENDING')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Heures Supplémentaires */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">
          Heures Supplémentaires ({pendingOvertimes.length} en attente)
        </h2>
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
                  <RequestRow
                    key={ot.id}
                    id={ot.id}
                    type="Heures Sup"
                    employee={ot.userName || 'Inconnu'}
                    email={ot.userEmail || ''}
                    status={ot.status}
                    details={`${new Date(ot.date).toLocaleDateString('fr-BE')} — ${ot.overtimeHours}h (${ot.hoursWorked}h travaillées, ${ot.hoursStandard}h standard)`}
                    onApprove={() => handleAction('overtime', ot.id, 'approve')}
                    onReject={() => {
                      const reason = prompt('Raison du rejet:')
                      if (reason) handleAction('overtime', ot.id, 'reject', reason)
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Demandes de Congé */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">
          Demandes de Congé ({pendingTimeOffs.length} en attente)
        </h2>
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
                    <RequestRow
                      key={to.id}
                      id={to.id}
                      type="Congé"
                      employee={to.userName || 'Inconnu'}
                      email={to.userEmail || ''}
                      status={to.status}
                      details={`${start.toLocaleDateString('fr-BE')} → ${end.toLocaleDateString('fr-BE')} (${days}j) — ${to.reason || 'Pas de raison'}`}
                      onApprove={() => handleAction('timeoff', to.id, 'approve')}
                      onReject={() => {
                        const reason = prompt('Raison du rejet:')
                        if (reason) handleAction('timeoff', to.id, 'reject', reason)
                      }}
                    />
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Demandes RTT */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">
          Demandes RTT ({pendingRtts.length} en attente)
        </h2>
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
                  <RequestRow
                    key={rtt.id}
                    id={rtt.id}
                    type="RTT"
                    employee={rtt.userName || 'Inconnu'}
                    email={rtt.userEmail || ''}
                    status={rtt.status}
                    details={`${new Date(rtt.date).toLocaleDateString('fr-BE')} — ${rtt.hoursToRecover}h — ${rtt.reason || 'Pas de raison'}`}
                    onApprove={() => handleAction('rtt', rtt.id, 'approve')}
                    onReject={() => {
                      const reason = prompt('Raison du rejet:')
                      if (reason) handleAction('rtt', rtt.id, 'reject', reason)
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
