'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

type ClockRecord = {
  id: string; date: string; arrivalTime: string; departureTime: string | null; duration: number | null; location: string
  editedAt: string | null; editReason: string | null; editNote: string | null
  editor: { name: string | null; email: string } | null
}
type TimeOff = {
  id: string; startDate: string; endDate: string; reason: string | null; status: string; createdAt: string
}
type RTT = {
  id: string; date: string; hoursToRecover: number; reason: string | null; status: string; createdAt: string
}
type Overtime = {
  id: string; date: string; hoursWorked: number; hoursStandard: number; overtimeHours: number; status: string
}
type Balance = { overtimeHours: number; rttHours: number; timeOffDays: number; balance: number }
type Site = { id: string; name: string }
type UserDetail = {
  id: string; name: string | null; email: string; role: string; createdAt: string
  defaultSiteId: string | null; defaultSite: Site | null
  userSchedule: { hoursPerDay: number; workSchedule: { name: string; type: string } | null } | null
  clockRecords: ClockRecord[]
  timeOffRequests: TimeOff[]
  rttRequests: RTT[]
  detectedOvertimes: Overtime[]
}

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}
const STATUS_KEY: Record<string, string> = {
  PENDING: 'statusPending', APPROVED: 'statusApproved', REJECTED: 'statusRejected',
}

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60); const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}
function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(BCP47[locale] ?? 'fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(BCP47[locale] ?? 'fr-BE', { hour: '2-digit', minute: '2-digit' })
}
function toDateInput(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}
function toTimeInput(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function daysBetween(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('userDetail')
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_KEY[status] ? t(STATUS_KEY[status]) : status}
    </span>
  )
}

// ── Shared inline input styles ────────────────────────────────────────────────
const inp = 'px-2 py-1 border border-[var(--pp-line)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]'

// DB-canonical location values (stored verbatim) → translated label key
const LOCATIONS: { value: string; key: string }[] = [
  { value: 'Sur site', key: 'locSite' },
  { value: 'Déplacement', key: 'locTravel' },
  { value: 'Télétravail', key: 'locRemote' },
]

function LocationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations('userDetail')
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inp}>
      {LOCATIONS.map(l => <option key={l.value} value={l.value}>{t(l.key)}</option>)}
    </select>
  )
}

const EDIT_REASONS: { value: string; key: string }[] = [
  { value: 'forgot_clockin', key: 'reasonForgotIn' },
  { value: 'forgot_clockout', key: 'reasonForgotOut' },
  { value: 'correction', key: 'reasonCorrection' },
  { value: 'other', key: 'reasonOther' },
]

// Inclut les motifs posés par le système, jamais proposés dans le select
const REASON_KEY: Record<string, string> = {
  forgot_clockin: 'reasonForgotIn',
  forgot_clockout: 'reasonForgotOut',
  correction: 'reasonCorrection',
  employee_request: 'reasonEmployeeRequest',
  manual_create: 'reasonManualCreate',
  other: 'reasonOther',
}

/** Pastille signalant un pointage encodé ou corrigé à la main, avec sa justification au survol. */
function EditedBadge({ record }: { record: ClockRecord }) {
  const t = useTranslations('userDetail')
  const locale = useLocale()
  if (!record.editedAt) return null

  const label = record.editReason ? t(REASON_KEY[record.editReason] ?? 'reasonCorrection') : t('reasonCorrection')
  const who = record.editor?.name ?? record.editor?.email ?? ''
  const title = [
    `${label} — ${who}`,
    `${fmtDate(record.editedAt, locale)} ${fmtTime(record.editedAt, locale)}`,
    record.editNote,
  ].filter(Boolean).join('\n')

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--pp-peach)]/10 text-[var(--pp-peach)] cursor-help"
    >
      ✎ {t('editedBadge')}
    </span>
  )
}

// ── Clock Records Tab ─────────────────────────────────────────────────────────
function ClockTab({ records, userId, onRefresh }: { records: ClockRecord[]; userId: string; onRefresh: () => void }) {
  const t = useTranslations('userDetail')
  const locale = useLocale()
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ date: '', arrival: '', departure: '', location: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [addData, setAddData] = useState({ date: '', arrival: '', departure: '', location: 'Sur site' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  // 'edit' = correction d'un pointage existant, 'add' = encodage manuel — même modale de motif
  const [reasonStep, setReasonStep] = useState<null | 'edit' | 'add'>(null)
  const [reason, setReason] = useState('forgot_clockin')
  const [reasonNote, setReasonNote] = useState('')

  const startEdit = (r: ClockRecord) => {
    setEditId(r.id)
    setEditData({
      date: toDateInput(r.date),
      arrival: toTimeInput(r.arrivalTime),
      departure: r.departureTime ? toTimeInput(r.departureTime) : '',
      location: r.location,
    })
    setErr('')
    setReasonStep(null)
    setReason('forgot_clockin')
    setReasonNote('')
  }

  const saveEdit = () => {
    if (!editData.date || !editData.arrival) { setErr(t('arrivalDepartureRequired')); return }
    setErr('')
    setReasonStep('edit')
  }

  const confirmSave = async () => {
    if (reason === 'other' && !reasonNote.trim()) { setErr(t('noteRequired')); return }
    setSaving(true)
    // Build ISO strings client-side so the browser's local timezone is used,
    // preventing the UTC+2 shift when the API runs in a UTC Docker container.
    const arrivalISO = new Date(`${editData.date}T${editData.arrival}:00`).toISOString()
    const departureISO = editData.departure
      ? new Date(`${editData.date}T${editData.departure}:00`).toISOString()
      : null
    const res = await fetch('/api/admin/clock-records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editId,
        date: editData.date,
        arrivalTime: arrivalISO,
        departureTime: departureISO,
        location: editData.location,
        reason,
        note: reasonNote.trim() || undefined,
      }),
    })
    setSaving(false)
    setReasonStep(null)
    if (!res.ok) { setErr((await res.json()).error); return }
    setEditId(null)
    onRefresh()
  }

  const del = async (id: string) => {
    if (!confirm(t('confirmDeleteClock'))) return
    const res = await fetch(`/api/admin/clock-records?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { setErr((await res.json()).error); return }
    onRefresh()
  }

  const startAdd = () => {
    if (!addData.date || !addData.arrival) { setErr(t('arrivalDepartureRequired')); return }
    setErr('')
    setReason('forgot_clockin')
    setReasonNote('')
    setReasonStep('add')
  }

  const confirmAdd = async () => {
    if (reason === 'other' && !reasonNote.trim()) { setErr(t('noteRequired')); return }
    setSaving(true); setErr('')
    const arrivalISO = new Date(`${addData.date}T${addData.arrival}:00`).toISOString()
    const departureISO = addData.departure
      ? new Date(`${addData.date}T${addData.departure}:00`).toISOString()
      : null
    const res = await fetch('/api/admin/clock-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        date: addData.date,
        arrivalTime: arrivalISO,
        departureTime: departureISO,
        location: addData.location,
        reason,
        note: reasonNote.trim() || undefined,
      }),
    })
    setSaving(false)
    setReasonStep(null)
    if (!res.ok) { setErr((await res.json()).error); return }
    setShowAdd(false)
    setAddData({ date: '', arrival: '', departure: '', location: 'Sur site' })
    onRefresh()
  }

  return (
    <Card>
      {/* Reason modal overlay */}
      {reasonStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setReasonStep(null)}>
          <div className="bg-[var(--pp-bg)] rounded-xl border border-[var(--pp-line)] shadow-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-[var(--pp-ink)] mb-1">{t('editReasonTitle')}</p>
            <p className="text-xs text-[var(--pp-muted)] mb-4">{t('editReasonHint')}</p>
            <select value={reason} onChange={e => setReason(e.target.value)} className={`${inp} w-full mb-3`}>
              {EDIT_REASONS.map(r => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
            </select>
            <textarea
              value={reasonNote}
              onChange={e => setReasonNote(e.target.value)}
              placeholder={reason === 'other' ? t('specifyReason') : t('notePlaceholder')}
              rows={2}
              className={`${inp} w-full mb-1 resize-none`}
              autoFocus
            />
            <p className="text-xs text-[var(--pp-muted)] mb-3">
              {reason === 'other' ? t('noteRequiredHint') : t('noteExportHint')}
            </p>
            {err && <p className="text-xs text-[var(--pp-neg)] mb-2">{err}</p>}
            <div className="flex gap-2 mt-1">
              <Button size="sm" onClick={reasonStep === 'add' ? confirmAdd : confirmSave} disabled={saving}>
                {saving ? '…' : t('confirm')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReasonStep(null)}>{t('cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('clockCount', { count: records.length })}</h2>
        <Button size="sm" onClick={() => { setShowAdd(true); setErr('') }}>{t('add')}</Button>
      </div>

      {err && <p className="text-xs text-[var(--pp-neg)] mb-3">{err}</p>}

      {showAdd && (
        <div className="mb-4 p-3 bg-[var(--pp-line)]/20 rounded-lg border border-[var(--pp-line)] flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('date')}</label>
            <input type="date" value={addData.date} onChange={e => setAddData(p => ({ ...p, date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('arrival')}</label>
            <input type="time" value={addData.arrival} onChange={e => setAddData(p => ({ ...p, arrival: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('departureOptional')}</label>
            <input type="time" value={addData.departure} onChange={e => setAddData(p => ({ ...p, departure: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('location')}</label>
            <LocationSelect value={addData.location} onChange={v => setAddData(p => ({ ...p, location: v }))} />
          </div>
          <Button size="sm" onClick={startAdd} disabled={saving}>{saving ? '…' : t('create')}</Button>
          <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setErr('') }}>{t('cancel')}</Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
              <th className="pb-3 pr-4 font-medium">{t('date')}</th>
              <th className="pb-3 pr-4 font-medium">{t('arrival')}</th>
              <th className="pb-3 pr-4 font-medium">{t('departure')}</th>
              <th className="pb-3 pr-4 font-medium">{t('duration')}</th>
              <th className="pb-3 pr-4 font-medium hidden md:table-cell">{t('location')}</th>
              <th className="pb-3 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--pp-line)]">
            {records.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-[var(--pp-muted)] italic text-sm">{t('noClockRecords')}</td></tr>
            )}
            {records.map(r => (
              <tr key={r.id} className={!r.departureTime ? 'opacity-70' : ''}>
                {editId === r.id ? (
                  <>
                    <td className="py-2 pr-2"><input type="date" value={editData.date} onChange={e => setEditData(p => ({ ...p, date: e.target.value }))} className={inp} /></td>
                    <td className="py-2 pr-2"><input type="time" value={editData.arrival} onChange={e => setEditData(p => ({ ...p, arrival: e.target.value }))} className={inp} /></td>
                    <td className="py-2 pr-2"><input type="time" value={editData.departure} onChange={e => setEditData(p => ({ ...p, departure: e.target.value }))} className={inp} /></td>
                    <td className="py-2 pr-2 text-xs text-[var(--pp-muted)]">—</td>
                    <td className="py-2 pr-2 hidden md:table-cell"><LocationSelect value={editData.location} onChange={v => setEditData(p => ({ ...p, location: v }))} /></td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" onClick={saveEdit} disabled={saving}>{saving ? '…' : t('save')}</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditId(null)}>✕</Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 pr-4 text-[var(--pp-ink)]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {fmtDate(r.date, locale)}
                        <EditedBadge record={r} />
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-[var(--pp-ink)]">{fmtTime(r.arrivalTime, locale)}</td>
                    <td className="py-3 pr-4">
                      {r.departureTime
                        ? <span className="text-[var(--pp-ink)]">{fmtTime(r.departureTime, locale)}</span>
                        : <span className="text-xs italic text-[var(--pp-neg)]">{t('notClocked')}</span>}
                    </td>
                    <td className="py-3 pr-4">
                      {r.duration != null
                        ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--pp-info)]/10 text-[var(--pp-info)]">{fmt(r.duration)}</span>
                        : <span className="text-xs text-[var(--pp-muted)]">—</span>}
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell text-xs text-[var(--pp-muted)]">{r.location}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(r)} className="text-xs text-[var(--pp-info)] hover:underline">{t('edit')}</button>
                        <button onClick={() => del(r.id)} className="text-xs text-[var(--pp-neg)] hover:underline">{t('delete')}</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length === 30 && (
        <p className="text-xs text-[var(--pp-muted)] mt-3 italic">{t('last30')}</p>
      )}
    </Card>
  )
}

// ── Time Off Tab ──────────────────────────────────────────────────────────────
function TimeOffTab({ timeoffs, userId, onRefresh }: { timeoffs: TimeOff[]; userId: string; onRefresh: () => void }) {
  const t = useTranslations('userDetail')
  const locale = useLocale()
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ startDate: '', endDate: '', reason: '', status: 'APPROVED' })
  const [showAdd, setShowAdd] = useState(false)
  const [addData, setAddData] = useState({ startDate: '', endDate: '', reason: '', status: 'APPROVED' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const startEdit = (to: TimeOff) => {
    setEditId(to.id)
    setEditData({ startDate: toDateInput(to.startDate), endDate: toDateInput(to.endDate), reason: to.reason ?? '', status: to.status })
    setErr('')
  }

  const saveEdit = async () => {
    if (!editData.startDate || !editData.endDate) { setErr(t('datesRequired')); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/admin/time-off', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, ...editData }),
    })
    setSaving(false)
    if (!res.ok) { setErr((await res.json()).error); return }
    setEditId(null)
    onRefresh()
  }

  const del = async (id: string) => {
    if (!confirm(t('confirmDeleteTimeOff'))) return
    const res = await fetch(`/api/admin/time-off?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { setErr((await res.json()).error); return }
    onRefresh()
  }

  const add = async () => {
    if (!addData.startDate || !addData.endDate) { setErr(t('datesRequired')); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/admin/time-off', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...addData }),
    })
    setSaving(false)
    if (!res.ok) { setErr((await res.json()).error); return }
    setShowAdd(false)
    setAddData({ startDate: '', endDate: '', reason: '', status: 'APPROVED' })
    onRefresh()
  }

  const StatusSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className={inp}>
      <option value="APPROVED">{t('statusApproved')}</option>
      <option value="PENDING">{t('statusPending')}</option>
      <option value="REJECTED">{t('statusRejected')}</option>
    </select>
  )

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('timeOffCount', { count: timeoffs.length })}</h2>
        <Button size="sm" onClick={() => { setShowAdd(true); setErr('') }}>{t('add')}</Button>
      </div>

      {err && <p className="text-xs text-[var(--pp-neg)] mb-3">{err}</p>}

      {showAdd && (
        <div className="mb-4 p-3 bg-[var(--pp-line)]/20 rounded-lg border border-[var(--pp-line)] flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('from')}</label>
            <input type="date" value={addData.startDate} onChange={e => setAddData(p => ({ ...p, startDate: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('to')}</label>
            <input type="date" value={addData.endDate} onChange={e => setAddData(p => ({ ...p, endDate: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('reason')}</label>
            <input value={addData.reason} onChange={e => setAddData(p => ({ ...p, reason: e.target.value }))} placeholder={t('timeOffReasonPlaceholder')} className={`${inp} w-36`} />
          </div>
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('status')}</label>
            <StatusSelect value={addData.status} onChange={v => setAddData(p => ({ ...p, status: v }))} />
          </div>
          <Button size="sm" onClick={add} disabled={saving}>{saving ? '…' : t('create')}</Button>
          <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setErr('') }}>{t('cancel')}</Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
              <th className="pb-3 pr-4 font-medium">{t('period')}</th>
              <th className="pb-3 pr-4 font-medium">{t('days')}</th>
              <th className="pb-3 pr-4 font-medium">{t('reason')}</th>
              <th className="pb-3 pr-4 font-medium">{t('status')}</th>
              <th className="pb-3 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--pp-line)]">
            {timeoffs.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-[var(--pp-muted)] italic text-sm">{t('noTimeOff')}</td></tr>
            )}
            {timeoffs.map(to => (
              <tr key={to.id}>
                {editId === to.id ? (
                  <>
                    <td className="py-2 pr-2">
                      <div className="flex gap-1 items-center">
                        <input type="date" value={editData.startDate} onChange={e => setEditData(p => ({ ...p, startDate: e.target.value }))} className={inp} />
                        <span className="text-[var(--pp-muted)] text-xs">→</span>
                        <input type="date" value={editData.endDate} onChange={e => setEditData(p => ({ ...p, endDate: e.target.value }))} className={inp} />
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-xs text-[var(--pp-muted)]">
                      {editData.startDate && editData.endDate ? daysBetween(editData.startDate, editData.endDate) + t('dayShort') : '—'}
                    </td>
                    <td className="py-2 pr-2"><input value={editData.reason} onChange={e => setEditData(p => ({ ...p, reason: e.target.value }))} className={`${inp} w-32`} /></td>
                    <td className="py-2 pr-2">
                      <StatusSelect value={editData.status} onChange={v => setEditData(p => ({ ...p, status: v }))} />
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" onClick={saveEdit} disabled={saving}>{saving ? '…' : t('save')}</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditId(null)}>✕</Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 pr-4 text-[var(--pp-ink)]">{fmtDate(to.startDate, locale)} → {fmtDate(to.endDate, locale)}</td>
                    <td className="py-3 pr-4 text-[var(--pp-ink)]">{daysBetween(to.startDate, to.endDate)}{t('dayShort')}</td>
                    <td className="py-3 pr-4 text-[var(--pp-muted)] max-w-xs truncate">{to.reason ?? '—'}</td>
                    <td className="py-3 pr-4"><StatusBadge status={to.status} /></td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(to)} className="text-xs text-[var(--pp-info)] hover:underline">{t('edit')}</button>
                        <button onClick={() => del(to.id)} className="text-xs text-[var(--pp-neg)] hover:underline">{t('delete')}</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── RTT Tab ───────────────────────────────────────────────────────────────────
function RTTTab({ rtts, userId, onRefresh }: { rtts: RTT[]; userId: string; onRefresh: () => void }) {
  const t = useTranslations('userDetail')
  const locale = useLocale()
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ date: '', hours: '', reason: '', status: 'APPROVED' })
  const [showAdd, setShowAdd] = useState(false)
  const [addData, setAddData] = useState({ date: '', hours: '', reason: '', status: 'APPROVED' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const startEdit = (r: RTT) => {
    setEditId(r.id)
    setEditData({ date: toDateInput(r.date), hours: String(r.hoursToRecover), reason: r.reason ?? '', status: r.status })
    setErr('')
  }

  const saveEdit = async () => {
    if (!editData.date || !editData.hours) { setErr(t('hoursRequired')); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/admin/rtt', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, date: editData.date, hoursToRecover: editData.hours, reason: editData.reason, status: editData.status }),
    })
    setSaving(false)
    if (!res.ok) { setErr((await res.json()).error); return }
    setEditId(null)
    onRefresh()
  }

  const del = async (id: string) => {
    if (!confirm(t('confirmDeleteRtt'))) return
    const res = await fetch(`/api/admin/rtt?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { setErr((await res.json()).error); return }
    onRefresh()
  }

  const add = async () => {
    if (!addData.date || !addData.hours) { setErr(t('hoursRequired')); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/admin/rtt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date: addData.date, hoursToRecover: addData.hours, reason: addData.reason, status: addData.status }),
    })
    setSaving(false)
    if (!res.ok) { setErr((await res.json()).error); return }
    setShowAdd(false)
    setAddData({ date: '', hours: '', reason: '', status: 'APPROVED' })
    onRefresh()
  }

  const StatusSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className={inp}>
      <option value="APPROVED">{t('statusApproved')}</option>
      <option value="PENDING">{t('statusPending')}</option>
      <option value="REJECTED">{t('statusRejected')}</option>
    </select>
  )

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('rttCount', { count: rtts.length })}</h2>
        <Button size="sm" onClick={() => { setShowAdd(true); setErr('') }}>{t('add')}</Button>
      </div>

      {err && <p className="text-xs text-[var(--pp-neg)] mb-3">{err}</p>}

      {showAdd && (
        <div className="mb-4 p-3 bg-[var(--pp-line)]/20 rounded-lg border border-[var(--pp-line)] flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('date')}</label>
            <input type="date" value={addData.date} onChange={e => setAddData(p => ({ ...p, date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('hours')}</label>
            <input type="number" step="0.5" min="0.5" max="8" value={addData.hours} onChange={e => setAddData(p => ({ ...p, hours: e.target.value }))} className={`${inp} w-20`} />
          </div>
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('reason')}</label>
            <input value={addData.reason} onChange={e => setAddData(p => ({ ...p, reason: e.target.value }))} placeholder={t('optional')} className={`${inp} w-36`} />
          </div>
          <div>
            <label className="block text-xs text-[var(--pp-muted)] mb-0.5">{t('status')}</label>
            <StatusSelect value={addData.status} onChange={v => setAddData(p => ({ ...p, status: v }))} />
          </div>
          <Button size="sm" onClick={add} disabled={saving}>{saving ? '…' : t('create')}</Button>
          <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setErr('') }}>{t('cancel')}</Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
              <th className="pb-3 pr-4 font-medium">{t('date')}</th>
              <th className="pb-3 pr-4 font-medium">{t('hours')}</th>
              <th className="pb-3 pr-4 font-medium">{t('reason')}</th>
              <th className="pb-3 pr-4 font-medium">{t('status')}</th>
              <th className="pb-3 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--pp-line)]">
            {rtts.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-[var(--pp-muted)] italic text-sm">{t('noRtt')}</td></tr>
            )}
            {rtts.map(r => (
              <tr key={r.id}>
                {editId === r.id ? (
                  <>
                    <td className="py-2 pr-2"><input type="date" value={editData.date} onChange={e => setEditData(p => ({ ...p, date: e.target.value }))} className={inp} /></td>
                    <td className="py-2 pr-2"><input type="number" step="0.5" min="0.5" max="8" value={editData.hours} onChange={e => setEditData(p => ({ ...p, hours: e.target.value }))} className={`${inp} w-20`} /></td>
                    <td className="py-2 pr-2"><input value={editData.reason} onChange={e => setEditData(p => ({ ...p, reason: e.target.value }))} className={`${inp} w-32`} /></td>
                    <td className="py-2 pr-2">
                      <StatusSelect value={editData.status} onChange={v => setEditData(p => ({ ...p, status: v }))} />
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" onClick={saveEdit} disabled={saving}>{saving ? '…' : t('save')}</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditId(null)}>✕</Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 pr-4 text-[var(--pp-ink)]">{fmtDate(r.date, locale)}</td>
                    <td className="py-3 pr-4 text-[var(--pp-ink)]">{r.hoursToRecover}h</td>
                    <td className="py-3 pr-4 text-[var(--pp-muted)] max-w-xs truncate">{r.reason ?? '—'}</td>
                    <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(r)} className="text-xs text-[var(--pp-info)] hover:underline">{t('edit')}</button>
                        <button onClick={() => del(r.id)} className="text-xs text-[var(--pp-neg)] hover:underline">{t('delete')}</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'clock' | 'timeoffs' | 'rtts' | 'overtimes'

export default function UserDetailPage() {
  const t = useTranslations('userDetail')
  const tc = useTranslations('common')
  const locale = useLocale()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<{ user: UserDetail; balance: Balance } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [sites, setSites] = useState<Site[]>([])
  const [siteId, setSiteId] = useState<string>('')
  const [savingSite, setSavingSite] = useState(false)
  const [adjustment, setAdjustment] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustErr, setAdjustErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/admin/sites').then(r => r.json()).then(setSites)
  }, [])
  useEffect(() => {
    if (data?.user) setSiteId(data.user.defaultSiteId ?? '')
  }, [data])

  const saveSite = async () => {
    setSavingSite(true)
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultSiteId: siteId || null }),
    })
    setSavingSite(false)
    load()
  }

  const submitAdjustment = async () => {
    const val = parseFloat(adjustment)
    if (isNaN(val) || val === 0) { setAdjustErr(t('invalidValue')); return }
    setAdjusting(true); setAdjustErr('')
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balanceAdjustment: val, adjustmentReason: adjustReason }),
    })
    if (!res.ok) { setAdjustErr((await res.json()).error); setAdjusting(false); return }
    setAdjustment(''); setAdjustReason('')
    setAdjusting(false)
    load()
  }

  if (loading) return <div className="p-8 text-center text-[var(--pp-muted)]">{t('loading')}</div>
  if (!data?.user) return <div className="p-8 text-center text-[var(--pp-neg)]">{t('notFound')}</div>

  const { user, balance } = data

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: t('tabOverview') },
    { key: 'clock', label: t('tabClock'), count: user.clockRecords.length },
    { key: 'timeoffs', label: t('tabTimeOffs'), count: user.timeOffRequests.length },
    { key: 'rtts', label: t('tabRtts'), count: user.rttRequests.length },
    { key: 'overtimes', label: t('tabOvertimes'), count: user.detectedOvertimes.length },
  ]

  return (
    <div className="p-6 md:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--pp-muted)] mb-6">
        <Link href="/admin/dashboard/users" className="hover:text-[var(--pp-ink)] transition">{t('breadcrumbUsers')}</Link>
        <span>/</span>
        <span className="text-[var(--pp-ink)] font-medium">{user.name ?? user.email}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{user.name ?? '—'}</h1>
          <p className="text-[var(--pp-muted)] text-sm mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              user.role === 'ADMIN' ? 'bg-[var(--pp-info)]/10 text-[var(--pp-info)]' : 'bg-[var(--pp-line)] text-[var(--pp-muted)]'
            }`}>
              {user.role === 'ADMIN' ? tc('roleAdmin') : tc('roleEmployee')}
            </span>
            <span className="text-xs text-[var(--pp-muted)]">{t('registeredOn', { date: fmtDate(user.createdAt, locale) })}</span>
          </div>
        </div>
        <Link
          href={`/admin/dashboard/reports?userId=${user.id}`}
          className="px-4 py-2 border border-[var(--pp-line)] rounded-lg text-sm font-medium text-[var(--pp-muted)] hover:text-[var(--pp-ink)] hover:bg-[var(--pp-line)]/30 transition"
        >
          {t('fullReport')}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--pp-line)] overflow-x-auto">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap flex items-center gap-1.5 ${
              tab === tb.key
                ? 'border-[var(--pp-info)] text-[var(--pp-info)]'
                : 'border-transparent text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
            }`}
          >
            {tb.label}
            {tb.count !== undefined && (
              <span className="text-xs bg-[var(--pp-line)] text-[var(--pp-muted)] px-1.5 py-0.5 rounded-full">{tb.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('cardOvertimeApproved'), value: `${balance.overtimeHours.toFixed(1)}h`, color: 'text-green-600' },
              { label: t('cardRttUsed'), value: `${balance.rttHours.toFixed(1)}h`, color: 'text-orange-500' },
              { label: t('cardTimeOffApproved'), value: `${balance.timeOffDays}${t('dayShort')}`, color: 'text-blue-500' },
              {
                label: t('cardNetBalance'),
                value: `${balance.balance >= 0 ? '+' : ''}${balance.balance.toFixed(1)}h`,
                color: balance.balance >= 0 ? 'text-green-600' : 'text-[var(--pp-neg)]',
              },
            ].map(s => (
              <Card key={s.label}>
                <p className="text-xs text-[var(--pp-muted)] mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </Card>
            ))}
          </div>

          <Card>
            <h2 className="text-sm font-semibold text-[var(--pp-ink)] mb-3">{t('defaultSite')}</h2>
            {sites.length === 0 ? (
              <p className="text-sm text-[var(--pp-muted)] italic">
                {t('noSiteConfigured')}{' '}
                <Link href="/admin/dashboard/sites" className="text-[var(--pp-info)] hover:underline">{t('createSite')}</Link>
              </p>
            ) : (
              <div className="flex gap-2 items-center flex-wrap">
                <select
                  value={siteId}
                  onChange={e => setSiteId(e.target.value)}
                  className="border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
                >
                  <option value="">{t('noDefaultSite')}</option>
                  {sites.map((s: Site) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={saveSite}
                  disabled={savingSite || siteId === (data?.user.defaultSiteId ?? '')}
                  className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition"
                >
                  {savingSite ? t('saving') : t('saveBtn')}
                </button>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-[var(--pp-ink)] mb-3">{t('workSchedule')}</h2>
            {user.userSchedule ? (
              <div>
                <p className="font-medium text-[var(--pp-ink)]">
                  {user.userSchedule.workSchedule?.name ?? t('customSchedule')}
                </p>
                <p className="text-xs text-[var(--pp-muted)] mt-0.5">
                  {t('scheduleDetail', { type: user.userSchedule.workSchedule?.type ?? '—', hours: user.userSchedule.hoursPerDay })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--pp-muted)] italic">
                {t('noSchedule')}{' '}
                <Link href="/admin/dashboard/schedules" className="text-[var(--pp-info)] hover:underline">{t('configure')}</Link>
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-[var(--pp-ink)] mb-3">{t('manualAdjust')}</h2>
            <p className="text-xs text-[var(--pp-muted)] mb-3">
              {t('adjustHint')}
            </p>
            {adjustErr && <p className="text-xs text-[var(--pp-neg)] mb-2">{adjustErr}</p>}
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="block text-xs text-[var(--pp-muted)] mb-1">{t('adjustHoursLabel')}</label>
                <input
                  type="number" step="0.5"
                  value={adjustment}
                  onChange={e => setAdjustment(e.target.value)}
                  placeholder="0"
                  className="w-28 px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--pp-muted)] mb-1">{t('adjustReasonLabel')}</label>
                <input
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder={t('adjustReasonPlaceholder')}
                  className="w-64 px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                />
              </div>
              <button
                onClick={submitAdjustment}
                disabled={adjusting || !adjustment}
                className="px-4 py-2 bg-[var(--pp-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition"
              >
                {adjusting ? t('saving') : t('apply')}
              </button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'clock' && (
        <ClockTab records={user.clockRecords} userId={user.id} onRefresh={load} />
      )}

      {tab === 'timeoffs' && (
        <TimeOffTab timeoffs={user.timeOffRequests} userId={user.id} onRefresh={load} />
      )}

      {tab === 'rtts' && (
        <RTTTab rtts={user.rttRequests} userId={user.id} onRefresh={load} />
      )}

      {/* Tab: Heures sup */}
      {tab === 'overtimes' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                  <th className="pb-3 pr-4 font-medium">{t('date')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('thWorked')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('thStandard')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('tabOvertimes')}</th>
                  <th className="pb-3 font-medium">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pp-line)]">
                {user.detectedOvertimes.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-[var(--pp-muted)] italic text-sm">{t('noOvertimes')}</td></tr>
                )}
                {user.detectedOvertimes.map(o => (
                  <tr key={o.id}>
                    <td className="py-3 pr-4 text-[var(--pp-ink)]">{fmtDate(o.date, locale)}</td>
                    <td className="py-3 pr-4 text-[var(--pp-ink)]">{o.hoursWorked.toFixed(1)}h</td>
                    <td className="py-3 pr-4 text-[var(--pp-muted)]">{o.hoursStandard.toFixed(1)}h</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        +{o.overtimeHours.toFixed(1)}h
                      </span>
                    </td>
                    <td className="py-3"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
