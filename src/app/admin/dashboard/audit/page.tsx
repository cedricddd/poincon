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
  clock_in: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  clock_out: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  admin_create: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  admin_edit: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  admin_delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  admin_update_user: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  admin_delete_user: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  admin_invite_user: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  admin_cancel_invitation: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  admin_approve: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  admin_reject: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  admin_balance_adjustment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

const actionLabels: Record<string, string> = {
  clock_in: 'Arrivée',
  clock_out: 'Départ',
  admin_create: 'Création Admin',
  admin_edit: 'Modification Admin',
  admin_delete: 'Suppression Admin',
  admin_update_user: 'Modif. Utilisateur',
  admin_delete_user: 'Suppr. Utilisateur',
  admin_invite_user: 'Invitation',
  admin_cancel_invitation: 'Annul. Invitation',
  admin_approve: 'Approbation',
  admin_reject: 'Refus',
  admin_balance_adjustment: 'Ajust. Solde',
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

function buildFilterParams(params: {
  filterAction: string
  filterUserId: string
  fromDate: string
  toDate: string
}) {
  return new URLSearchParams({
    ...(params.filterAction && { action: params.filterAction }),
    ...(params.filterUserId && { userId: params.filterUserId }),
    ...(params.fromDate && { from: params.fromDate }),
    ...(params.toDate && { to: params.toDate }),
  })
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
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
        ...Object.fromEntries(buildFilterParams({ filterAction, filterUserId, fromDate, toDate })),
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

  const exportCsv = async () => {
    setExportingCsv(true)
    try {
      const params = buildFilterParams({ filterAction, filterUserId, fromDate, toDate })
      const res = await fetch(`/api/admin/audit-logs/export?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setExportingCsv(false)
    }
  }

  const summarizeChangesForPdf = (raw: string): string => {
    if (!raw) return '—'
    try {
      const c = JSON.parse(raw)
      const parts: string[] = []

      const reasonLabels: Record<string, string> = {
        forgot_clockin: 'Oublié pointer (arrivée)',
        forgot_clockout: 'Oublié dépointer (départ)',
        correction: 'Correction d\'erreur',
        other: 'Autre',
        manual_create: 'Création manuelle',
      }
      if (c.reason) parts.push(`Motif: ${reasonLabels[c.reason] ?? c.reason}`)
      if (c.note) parts.push(`Note: ${c.note}`)

      if (c.before && c.after) {
        if (c.before.arrivalTime || c.after.arrivalTime)
          parts.push(`Arrivée: ${c.before.arrivalTime ?? '—'} → ${c.after.arrivalTime ?? '—'}`)
        if (c.before.departureTime || c.after.departureTime)
          parts.push(`Départ: ${c.before.departureTime ?? '—'} → ${c.after.departureTime ?? '—'}`)
        if (c.before.location !== c.after.location)
          parts.push(`Lieu: ${c.before.location} → ${c.after.location}`)
      } else {
        if (c.arrivalTime) parts.push(`Arrivée: ${c.arrivalTime}`)
        if (c.departureTime) parts.push(`Départ: ${c.departureTime}`)
        if (c.location) parts.push(`Lieu: ${c.location}`)
      }

      // settings_change
      if (c.before && c.after && 'mealBreakEnabled' in (c.before ?? {})) {
        const keys = Object.keys(c.after) as string[]
        keys.forEach(k => {
          if (c.before[k] !== c.after[k])
            parts.push(`${k}: ${c.before[k]} → ${c.after[k]}`)
        })
      }

      return parts.length > 0 ? parts.join(' · ') : raw.slice(0, 80)
    } catch {
      return raw.slice(0, 80)
    }
  }

  const exportPdf = async () => {
    setExportingPdf(true)
    try {
      const params = buildFilterParams({ filterAction, filterUserId, fromDate, toDate })
      const res = await fetch(`/api/admin/audit-logs/export?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const text = await res.text()

      // Parse CSV rows (skip header)
      const rows = text.trim().split('\r\n').slice(1).map(line => {
        const cells: string[] = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
            else inQuotes = !inQuotes
          } else if (ch === ',' && !inQuotes) {
            cells.push(current); current = ''
          } else {
            current += ch
          }
        }
        cells.push(current)
        return cells
      })

      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      doc.setFontSize(14)
      doc.text('Audit Trail — Pointon', 14, 16)
      doc.setFontSize(9)
      doc.text(`Généré le ${new Date().toLocaleString('fr-BE')}`, 14, 22)

      // r[0]=date r[1]=user r[2]=email r[3]=action r[4]=resource r[5]=changes r[6]=statut r[7]=ip
      autoTable(doc, {
        startY: 28,
        head: [['Date/Heure', 'Utilisateur', 'Email', 'Action', 'Ressource', 'Statut', 'Changements']],
        body: rows.map(r => [r[0], r[1], r[2], r[3], r[4], r[6], summarizeChangesForPdf(r[5])]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [30, 64, 175] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 6: { cellWidth: 70 } },
      })

      doc.save(`audit-trail-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      console.error(e)
    } finally {
      setExportingPdf(false)
    }
  }

  if (loading && logs.length === 0) {
    return <div className="p-8 text-center dark:text-gray-300">Chargement...</div>
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Audit Trail</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={exportingCsv}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60 text-sm font-medium"
          >
            {exportingCsv ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            Export CSV
          </button>
          <button
            onClick={exportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60 text-sm font-medium"
          >
            {exportingPdf ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            )}
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action</label>
            <select
              value={filterAction}
              onChange={e => { setFilterAction(e.target.value); setPage(1) }}
              className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Toutes les actions</option>
              <option value="clock_in">Arrivée</option>
              <option value="clock_out">Départ</option>
              <option value="admin_update_user">Modif. Utilisateur</option>
              <option value="admin_delete_user">Suppr. Utilisateur</option>
              <option value="admin_invite_user">Invitation</option>
              <option value="admin_cancel_invitation">Annul. Invitation</option>
              <option value="admin_approve">Approbation</option>
              <option value="admin_reject">Refus</option>
              <option value="admin_balance_adjustment">Ajust. Solde</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Début</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setPage(1) }}
              className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Fin</label>
            <input
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setPage(1) }}
              className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 dark:text-gray-200">Date/Heure</th>
              <th className="px-4 py-3 dark:text-gray-200">Utilisateur</th>
              <th className="px-4 py-3 dark:text-gray-200">Action</th>
              <th className="px-4 py-3 dark:text-gray-200">Ressource</th>
              <th className="px-4 py-3 dark:text-gray-200">Changements</th>
              <th className="px-4 py-3 dark:text-gray-200">Adresse IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                  Aucun log d&apos;audit
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 whitespace-nowrap text-xs dark:text-gray-300">
                    {formatDistanceToNow(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {log.user ? (
                      <div className="text-sm">
                        <div className="font-medium dark:text-gray-200">{log.user.name || 'N/A'}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">{log.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Anonymisé</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        actionBadgeColor[log.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs dark:text-gray-300">
                    <div>{log.resource}</div>
                    {log.resourceId && <div className="text-gray-500 dark:text-gray-500 break-words">{log.resourceId}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.changes ? (
                      <pre className="bg-gray-100 dark:bg-gray-900 dark:text-gray-300 p-2 rounded overflow-auto max-w-xs max-h-24">
                        {JSON.stringify(JSON.parse(log.changes), null, 2)}
                      </pre>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{log.ipAddress || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Affichage {logs.length > 0 ? (page - 1) * limit + 1 : 0} à {Math.min(page * limit, total)} sur {total}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Précédent
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - page) <= 1 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <div key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2 dark:text-gray-400">…</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 rounded ${
                      page === p ? 'bg-blue-500 text-white' : 'border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
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
            className="px-4 py-2 border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  )
}
