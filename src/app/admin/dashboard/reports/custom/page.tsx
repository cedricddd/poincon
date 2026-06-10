'use client'

export const dynamic = 'force-dynamic'
import { useState, useCallback } from 'react'
import { showToast } from '@/hooks/useToast'

interface ReportRow {
  key: string
  label: string
  shiftCount: number
  totalHours: number
  timeOffDays: number
  shiftTypes: Record<string, number>
}

interface Employee { id: string; name: string }
interface Team { id: string; name: string }

const SHIFT_TYPE_LABELS: Record<string, string> = {
  DAY: 'Journée', MORNING: 'Matin', AFTERNOON: 'Après-midi', NIGHT: 'Nuit',
}

const GROUP_LABELS: Record<string, string> = {
  employee: 'Employé', team: 'Équipe', week: 'Semaine', month: 'Mois',
}

function today(): string { return new Date().toISOString().split('T')[0] }
function monthAgo(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]
}

export default function CustomReportsPage() {
  const [from, setFrom] = useState(monthAgo)
  const [to, setTo] = useState(today)
  const [groupBy, setGroupBy] = useState<'employee' | 'team' | 'week' | 'month'>('employee')
  const [shiftType, setShiftType] = useState('')
  const [teamId, setTeamId] = useState('')
  const [rows, setRows] = useState<ReportRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)
  const [addonRequired, setAddonRequired] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ from, to, groupBy })
    if (shiftType) params.set('shiftType', shiftType)
    if (teamId) params.set('teamId', teamId)
    const res = await fetch(`/api/admin/reports/custom?${params}`)
    if (res.status === 403) {
      setAddonRequired(true); setLoading(false); return
    }
    if (!res.ok) { showToast('Erreur', 'error'); setLoading(false); return }
    const data = await res.json()
    setRows(data.rows ?? [])
    setTeams(data.teams ?? [])
    setEmployees(data.employees ?? [])
    setRan(true)
    setAddonRequired(false)
    setLoading(false)
  }, [from, to, groupBy, shiftType, teamId])

  const exportCsv = () => {
    if (rows.length === 0) return
    const header = ['Groupe', 'Shifts', 'Heures totales', 'Jours congés', ...Object.keys(SHIFT_TYPE_LABELS).map(k => SHIFT_TYPE_LABELS[k])]
    const lines = [header.join(';')]
    for (const r of rows) {
      lines.push([
        r.label,
        r.shiftCount,
        r.totalHours.toFixed(2),
        r.timeOffDays,
        ...Object.keys(SHIFT_TYPE_LABELS).map(k => r.shiftTypes[k] ?? 0),
      ].join(';'))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `rapport_custom_${from}_${to}.csv`; a.click()
  }

  const totalShifts = rows.reduce((s, r) => s + r.shiftCount, 0)
  const totalHours = rows.reduce((s, r) => s + r.totalHours, 0)
  const totalTimeOff = rows.reduce((s, r) => s + r.timeOffDays, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Rapports personnalisés</h1>
        <p className="text-sm text-[var(--pp-muted)] mt-1">Filtrez, regroupez et exportez vos données RH.</p>
      </div>

      {addonRequired && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          L&apos;add-on <strong>Rapports custom</strong> est requis. Activez-le dans <a href="/admin/dashboard/settings/integrations" className="underline">Intégrations</a>.
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--pp-ink)]">Filtres</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-[var(--pp-muted)] block mb-1">Du</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full border border-[var(--pp-line)] rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-[var(--pp-muted)] block mb-1">Au</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full border border-[var(--pp-line)] rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-[var(--pp-muted)] block mb-1">Regrouper par</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)} className="w-full border border-[var(--pp-line)] rounded-lg px-2 py-1.5 text-sm">
              {Object.entries(GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--pp-muted)] block mb-1">Type de shift</label>
            <select value={shiftType} onChange={e => setShiftType(e.target.value)} className="w-full border border-[var(--pp-line)] rounded-lg px-2 py-1.5 text-sm">
              <option value="">Tous</option>
              {Object.entries(SHIFT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--pp-muted)] block mb-1">Équipe</label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full border border-[var(--pp-line)] rounded-lg px-2 py-1.5 text-sm">
              <option value="">Toutes</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={run} disabled={loading} className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? 'Calcul...' : 'Générer le rapport'}
          </button>
          {ran && rows.length > 0 && (
            <button onClick={exportCsv} className="px-4 py-2 border border-[var(--pp-line)] rounded-lg text-sm font-medium hover:bg-gray-50">
              Exporter CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      {ran && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total shifts', value: totalShifts },
            { label: 'Heures travaillées', value: totalHours.toFixed(1) + 'h' },
            { label: 'Jours de congés', value: totalTimeOff },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl px-5 py-4 text-center">
              <div className="text-2xl font-bold text-[var(--pp-ink)]">{kpi.value}</div>
              <div className="text-xs text-[var(--pp-muted)] mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {ran && (
        rows.length === 0 ? (
          <div className="text-center py-12 text-[var(--pp-muted)]">Aucune donnée pour ces filtres.</div>
        ) : (
          <div className="bg-[var(--pp-bg)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--pp-line)] bg-[var(--pp-bg2)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--pp-muted)]">{GROUP_LABELS[groupBy]}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--pp-muted)]">Shifts</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--pp-muted)]">Heures</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--pp-muted)]">Congés</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--pp-muted)] hidden sm:table-cell">Journée</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--pp-muted)] hidden sm:table-cell">Matin</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--pp-muted)] hidden sm:table-cell">APM</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--pp-muted)] hidden sm:table-cell">Nuit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pp-line)]">
                  {rows.map(row => (
                    <tr key={row.key} className="hover:bg-[var(--pp-bg2)]/50">
                      <td className="px-4 py-3 font-medium text-[var(--pp-ink)]">{row.label}</td>
                      <td className="px-4 py-3 text-right text-[var(--pp-ink)]">{row.shiftCount}</td>
                      <td className="px-4 py-3 text-right text-[var(--pp-ink)]">{row.totalHours.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right text-[var(--pp-muted)]">{row.timeOffDays}j</td>
                      <td className="px-4 py-3 text-right text-[var(--pp-muted)] hidden sm:table-cell">{row.shiftTypes['DAY'] ?? 0}</td>
                      <td className="px-4 py-3 text-right text-[var(--pp-muted)] hidden sm:table-cell">{row.shiftTypes['MORNING'] ?? 0}</td>
                      <td className="px-4 py-3 text-right text-[var(--pp-muted)] hidden sm:table-cell">{row.shiftTypes['AFTERNOON'] ?? 0}</td>
                      <td className="px-4 py-3 text-right text-[var(--pp-muted)] hidden sm:table-cell">{row.shiftTypes['NIGHT'] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--pp-line)] bg-[var(--pp-bg2)] font-semibold">
                    <td className="px-4 py-3 text-xs text-[var(--pp-muted)]">Total</td>
                    <td className="px-4 py-3 text-right text-[var(--pp-ink)]">{totalShifts}</td>
                    <td className="px-4 py-3 text-right text-[var(--pp-ink)]">{totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right text-[var(--pp-muted)]">{totalTimeOff}j</td>
                    <td className="px-4 py-3 hidden sm:table-cell" colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  )
}
