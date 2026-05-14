'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'

interface AuditLog {
  id: string
  userId: string | null
  action: string
  resource: string
  resourceId: string | null
  changes: string | null
  ipAddress: string | null
  userAgent: string | null
  status: string
  createdAt: string
  user?: {
    id: string
    name: string | null
    email: string
  }
}

interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const actionBadgeColor: Record<string, string> = {
  clock_in: 'bg-green-100 text-green-800',
  clock_out: 'bg-blue-100 text-blue-800',
  admin_create: 'bg-orange-100 text-orange-800',
  admin_edit: 'bg-orange-100 text-orange-800',
  admin_delete: 'bg-red-100 text-red-800',
}

const actionLabels: Record<string, string> = {
  clock_in: 'Arrivée',
  clock_out: 'Départ',
  admin_create: 'Création Admin',
  admin_edit: 'Modification Admin',
  admin_delete: 'Suppression Admin',
}

function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'à l\'instant'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [filterAction, setFilterAction] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [page, limit, filterAction, filterUserId, fromDate, toDate])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filterAction && { action: filterAction }),
        ...(filterUserId && { userId: filterUserId }),
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
      })

      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (res.ok) {
        const data: AuditResponse = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setPage(1)
    setFilterAction('')
    setFilterUserId('')
    setFromDate('')
    setToDate('')
  }

  if (loading && logs.length === 0) {
    return <div className="p-8 text-center">Chargement...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Audit Trail</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={filterAction}
              onChange={e => {
                setFilterAction(e.target.value)
                setPage(1)
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Toutes les actions</option>
              <option value="clock_in">Arrivée</option>
              <option value="clock_out">Départ</option>
              <option value="admin_create">Création Admin</option>
              <option value="admin_edit">Modification Admin</option>
              <option value="admin_delete">Suppression Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Début</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => {
                setFromDate(e.target.value)
                setPage(1)
              }}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Fin</label>
            <input
              type="date"
              value={toDate}
              onChange={e => {
                setToDate(e.target.value)
                setPage(1)
              }}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3">Date/Heure</th>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Ressource</th>
              <th className="px-4 py-3">Changements</th>
              <th className="px-4 py-3">Adresse IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  Aucun log d&apos;audit
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {formatDistanceToNow(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {log.user ? (
                      <div className="text-sm">
                        <div className="font-medium">{log.user.name || 'N/A'}</div>
                        <div className="text-gray-500 text-xs">{log.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Anonymisé</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        actionBadgeColor[log.action] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{log.resource}</div>
                    {log.resourceId && <div className="text-gray-500 break-words">{log.resourceId}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.changes ? (
                      <pre className="bg-gray-100 p-2 rounded overflow-auto max-w-xs max-h-24">
                        {JSON.stringify(JSON.parse(log.changes), null, 2)}
                      </pre>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{log.ipAddress || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Affichage {logs.length > 0 ? (page - 1) * limit + 1 : 0} à {Math.min(page * limit, total)} sur {total}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Précédent
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - page) <= 1 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <div key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2">…</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 rounded ${
                      page === p ? 'bg-blue-500 text-white' : 'border hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                </div>
              ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  )
}
