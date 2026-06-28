'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export interface ShiftFormData {
  userId: string
  date: string // YYYY-MM-DD
  startTime: string
  endTime: string
  shiftType: string
  note: string
}

interface User {
  id: string
  name: string | null
  email: string
}

interface Shift {
  id: string
  userId: string
  date: string
  startTime: string
  endTime: string
  shiftType?: string | null
  note?: string | null
}

interface ShiftModalProps {
  mode: 'create' | 'edit'
  initialData: Partial<ShiftFormData>
  users: User[]
  shift?: Shift
  onSave: (data: ShiftFormData) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

const SHIFT_TYPES = [
  { value: 'DAY', labelKey: 'legDay', descKey: 'descDay' },
  { value: 'MORNING', labelKey: 'legMorning', descKey: 'descMorning' },
  { value: 'AFTERNOON', labelKey: 'legAfternoon', descKey: 'descAfternoon' },
  { value: 'NIGHT', labelKey: 'legNight', descKey: 'descNight' },
  { value: 'PARTIAL', labelKey: 'legPartial', descKey: 'descPartial' },
  { value: 'VARIABLE', labelKey: 'legVariable', descKey: 'descVariable' },
]

export function ShiftModal({ mode, initialData, users, shift, onSave, onDelete, onClose }: ShiftModalProps) {
  const t = useTranslations('planning')
  const [userId, setUserId] = useState(initialData.userId ?? '')
  const [date, setDate] = useState(initialData.date ?? '')
  const [startTime, setStartTime] = useState(initialData.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(initialData.endTime ?? '17:00')
  const [shiftType, setShiftType] = useState(initialData.shiftType ?? 'DAY')
  const [note, setNote] = useState(initialData.note ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (shift) {
      setUserId(shift.userId)
      setDate(shift.date.slice(0, 10))
      setStartTime(shift.startTime)
      setEndTime(shift.endTime)
      setShiftType(shift.shiftType ?? 'DAY')
      setNote(shift.note ?? '')
    }
  }, [shift])

  const handleSave = async () => {
    if (!userId || !date || !startTime || !endTime) {
      setError(t('errRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ userId, date, startTime, endTime, shiftType, note })
      onClose()
    } catch {
      setError(t('errSave'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm(t('confirmDelete'))) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch {
      setError(t('errDeleteModal'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--pp-bg)] border border-[var(--pp-line)] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[var(--pp-ink)]">
            {mode === 'create' ? t('modalCreate') : t('modalEdit')}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--pp-muted)] hover:text-[var(--pp-ink)] transition p-1 rounded-lg hover:bg-[var(--pp-line)]/40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {mode === 'create' && (
            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('fEmployee')}</label>
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
              >
                <option value="">{t('selectEmployee')}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('fDate')}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('fStart')}</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('fEnd')}</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1.5">{t('fShiftType')}</label>
            <div className="grid grid-cols-2 gap-2">
              {SHIFT_TYPES.map(st => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setShiftType(st.value)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                    shiftType === st.value
                      ? 'border-[var(--pp-info)] bg-[var(--pp-info)]/8 text-[var(--pp-info)]'
                      : 'border-[var(--pp-line)] hover:border-[var(--pp-info)]/50 text-[var(--pp-ink)]'
                  }`}
                >
                  <div className="font-medium">{t(st.labelKey)}</div>
                  <div className="text-[10px] text-[var(--pp-muted)] mt-0.5">{t(st.descKey)}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">{t('fNote')}</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('fNotePlaceholder')}
              className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
            />
          </div>

          {error && <p className="text-xs text-[var(--pp-neg)]">{error}</p>}
        </div>

        <div className="flex items-center justify-between mt-6">
          <div>
            {mode === 'edit' && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 text-sm text-[var(--pp-neg)] border border-[var(--pp-neg)]/30 rounded-lg hover:bg-[var(--pp-neg)]/8 transition disabled:opacity-50"
              >
                {deleting ? t('deleting') : t('delete')}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--pp-muted)] border border-[var(--pp-line)] rounded-lg hover:bg-[var(--pp-bg2)] transition"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--pp-info)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? t('saving') : mode === 'create' ? t('create') : t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
