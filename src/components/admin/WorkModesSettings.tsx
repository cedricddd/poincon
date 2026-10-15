'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

type WorkMode = {
  id: string
  code: string
  label: string
  boniCapMinutes: number | null
  dailyMaxMinutes: number | null
  latestClockTime: string | null
  payrollFlag: string | null
  isDefault: boolean
  sortOrder: number
  active: boolean
}

// Form values are strings: durations as "H:MM" (empty = no limit), latest time as "HH:MM".
type Draft = {
  code: string
  label: string
  boniCap: string
  dailyMax: string
  latestClockTime: string
  noSocialTransport: boolean
  isDefault: boolean
}

const EMPTY_DRAFT: Draft = { code: '', label: '', boniCap: '', dailyMax: '', latestClockTime: '', noSocialTransport: false, isDefault: false }

const toHM = (minutes: number | null) =>
  minutes == null ? '' : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`

function fromHM(value: string): number | null | undefined {
  const v = value.trim()
  if (!v) return null
  const m = /^(\d{1,2})(?::([0-5]\d))?$/.exec(v)
  if (!m) return undefined
  return Number(m[1]) * 60 + Number(m[2] ?? 0)
}

const toDraft = (m: WorkMode): Draft => ({
  code: m.code,
  label: m.label,
  boniCap: toHM(m.boniCapMinutes),
  dailyMax: toHM(m.dailyMaxMinutes),
  latestClockTime: m.latestClockTime ?? '',
  noSocialTransport: m.payrollFlag === 'no_social_transport',
  isDefault: m.isDefault,
})

export function WorkModesSettings() {
  const t = useTranslations('workModes')
  const [enabled, setEnabled] = useState(false)
  const [modes, setModes] = useState<WorkMode[]>([])
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/work-modes')
    if (!res.ok) return
    const data = await res.json()
    setEnabled(data.enabled)
    setModes(data.modes)
  }, [])

  useEffect(() => { load() }, [load])

  if (!enabled) return null

  const startEdit = (m: WorkMode | null) => {
    setError('')
    setEditingId(m ? m.id : 'new')
    setDraft(m ? toDraft(m) : EMPTY_DRAFT)
  }

  const save = async () => {
    const boniCapMinutes = fromHM(draft.boniCap)
    const dailyMaxMinutes = fromHM(draft.dailyMax)
    if (boniCapMinutes === undefined || dailyMaxMinutes === undefined) {
      setError(t('durationFormat'))
      return
    }
    setSaving(true)
    setError('')
    const body = {
      code: draft.code,
      label: draft.label,
      boniCapMinutes,
      dailyMaxMinutes,
      latestClockTime: draft.latestClockTime || null,
      payrollFlag: draft.noSocialTransport ? 'no_social_transport' : null,
      isDefault: draft.isDefault,
      ...(editingId === 'new' && { sortOrder: modes.length }),
    }
    const res = await fetch(editingId === 'new' ? '/api/admin/work-modes' : `/api/admin/work-modes/${editingId}`, {
      method: editingId === 'new' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? t('saveError'))
      return
    }
    setEditingId(null)
    load()
  }

  const remove = async (m: WorkMode) => {
    const res = await fetch(`/api/admin/work-modes/${m.id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  const reactivate = async (m: WorkMode) => {
    const res = await fetch(`/api/admin/work-modes/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    })
    if (res.ok) load()
  }

  const prefill = async () => {
    const res = await fetch('/api/admin/work-modes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefill: true }),
    })
    if (res.ok) load()
  }

  const rule = (m: WorkMode) => {
    const parts: string[] = []
    parts.push(m.boniCapMinutes === 0 ? t('noBoni') : m.boniCapMinutes == null ? t('boniUnlimited') : t('boniUpTo', { value: toHM(m.boniCapMinutes) }))
    if (m.dailyMaxMinutes != null) parts.push(t('maxPerDay', { value: toHM(m.dailyMaxMinutes) }))
    if (m.latestClockTime) parts.push(t('notAfter', { time: m.latestClockTime }))
    if (m.payrollFlag === 'no_social_transport') parts.push(t('noSocialTransport'))
    return parts.join(' · ')
  }

  const input = 'w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm'

  return (
    <Card>
      <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-1">{t('title')}</h2>
      <p className="text-xs text-[var(--pp-muted)] mb-4">{t('desc')}</p>

      {modes.length === 0 && editingId === null && (
        <div className="p-4 border border-dashed border-[var(--pp-line)] rounded-lg text-sm text-[var(--pp-muted)] mb-4">
          <p className="mb-3">{t('empty')}</p>
          <Button size="sm" onClick={prefill}>{t('prefill')}</Button>
        </div>
      )}

      <div className="space-y-2">
        {modes.map(m => (
          editingId === m.id ? null : (
            <div key={m.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 border border-[var(--pp-line)] rounded-lg ${m.active ? '' : 'opacity-50'}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--pp-ink)]">
                  <span className="font-mono mr-2">{m.code}</span>{m.label}
                  {m.isDefault && <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--pp-pos)]">{t('default')}</span>}
                  {!m.active && <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--pp-muted)]">{t('inactive')}</span>}
                </p>
                <p className="text-xs text-[var(--pp-muted)]">{rule(m)}</p>
              </div>
              <div className="flex gap-2">
                {m.active ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => startEdit(m)}>{t('edit')}</Button>
                    <Button size="sm" variant="outline" onClick={() => remove(m)}>{t('remove')}</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => reactivate(m)}>{t('reactivate')}</Button>
                )}
              </div>
            </div>
          )
        ))}
      </div>

      {editingId !== null && (
        <div className="mt-3 p-4 border border-[var(--pp-line)] rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-[var(--pp-muted)]">{t('code')}
              <input className={input} value={draft.code} maxLength={10} placeholder="TT" onChange={e => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
            </label>
            <label className="text-xs text-[var(--pp-muted)] sm:col-span-2">{t('label')}
              <input className={input} value={draft.label} maxLength={60} placeholder={t('labelPlaceholder')} onChange={e => setDraft({ ...draft, label: e.target.value })} />
            </label>
            <label className="text-xs text-[var(--pp-muted)]">{t('boniCap')}
              <input className={input} value={draft.boniCap} placeholder={t('unlimited')} onChange={e => setDraft({ ...draft, boniCap: e.target.value })} />
              <span className="block mt-1">{t('boniCapHelp')}</span>
            </label>
            <label className="text-xs text-[var(--pp-muted)]">{t('dailyMax')}
              <input className={input} value={draft.dailyMax} placeholder={t('unlimited')} onChange={e => setDraft({ ...draft, dailyMax: e.target.value })} />
              <span className="block mt-1">{t('dailyMaxHelp')}</span>
            </label>
            <label className="text-xs text-[var(--pp-muted)]">{t('latest')}
              <input className={input} type="time" value={draft.latestClockTime} onChange={e => setDraft({ ...draft, latestClockTime: e.target.value })} />
              <span className="block mt-1">{t('latestHelp')}</span>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--pp-ink)]">
            <input type="checkbox" checked={draft.noSocialTransport} onChange={e => setDraft({ ...draft, noSocialTransport: e.target.checked })} />
            {t('noSocialTransportOption')}
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--pp-ink)]">
            <input type="checkbox" checked={draft.isDefault} onChange={e => setDraft({ ...draft, isDefault: e.target.checked })} />
            {t('defaultOption')}
          </label>
          {error && <p className="text-sm text-[var(--pp-neg,#ef4444)]">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>{t('save')}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>{t('cancel')}</Button>
          </div>
        </div>
      )}

      {editingId === null && modes.length > 0 && (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={() => startEdit(null)}>{t('add')}</Button>
        </div>
      )}
    </Card>
  )
}
