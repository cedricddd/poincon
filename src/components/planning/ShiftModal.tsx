'use client'

import { useState, useEffect } from 'react'

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
  { value: 'DAY', label: 'Journée', description: 'Horaire de jour standard' },
  { value: 'MORNING', label: 'Matin (2×8)', description: 'Ex. 06:00 – 14:00' },
  { value: 'AFTERNOON', label: 'Après-midi (2×8)', description: 'Ex. 14:00 – 22:00' },
  { value: 'NIGHT', label: 'Nuit (3×8)', description: 'Ex. 22:00 – 06:00' },
]

export function ShiftModal({ mode, initialData, users, shift, onSave, onDelete, onClose }: ShiftModalProps) {
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
      setError('Tous les champs obligatoires doivent être remplis.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ userId, date, startTime, endTime, shiftType, note })
      onClose()
    } catch {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Supprimer ce shift ?')) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch {
      setError('Erreur lors de la suppression.')
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
            {mode === 'create' ? 'Créer un shift' : 'Modifier le shift'}
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
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Employé *</label>
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
              >
                <option value="">Sélectionner un employé...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Début *</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Fin *</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full border border-[var(--pp-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1.5">Type d'horaire</label>
            <div className="grid grid-cols-2 gap-2">
              {SHIFT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setShiftType(t.value)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                    shiftType === t.value
                      ? 'border-[var(--pp-info)] bg-[var(--pp-info)]/8 text-[var(--pp-info)]'
                      : 'border-[var(--pp-line)] hover:border-[var(--pp-info)]/50 text-[var(--pp-ink)]'
                  }`}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-[10px] text-[var(--pp-muted)] mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--pp-muted)] mb-1">Note (optionnel)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Remarque, poste, site..."
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
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--pp-muted)] border border-[var(--pp-line)] rounded-lg hover:bg-[var(--pp-bg2)] transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--pp-info)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
