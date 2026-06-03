'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef, useCallback } from 'react'

/* ── Types ─────────────────────────────────────────────────────────────── */

interface Item {
  id: string
  type: 'NOTE' | 'LINK' | 'EVENT' | 'TASK'
  title: string
  content?: string
  url?: string
  date?: string
  time?: string
  eventType?: string
  done: boolean
}

const EVENT_TYPES = [
  { value: 'CALL',     label: '📞 Appel',    color: '#0ea5e9' },
  { value: 'DEMO',     label: '🎯 Démo',     color: '#10b981' },
  { value: 'TASK',     label: '📋 Tâche',    color: '#6366f1' },
  { value: 'REMINDER', label: '🔔 Rappel',   color: '#f59e0b' },
]

function eventColor(type?: string) {
  return EVENT_TYPES.find(t => t.value === type)?.color ?? '#6366f1'
}
function eventLabel(type?: string) {
  return EVENT_TYPES.find(t => t.value === type)?.label ?? '📋 Tâche'
}

function today() { return new Date().toISOString().split('T')[0] }
function startOfWeek() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]
}
function endOfWeek() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay() + 7); return d.toISOString().split('T')[0]
}
function startOfMonth() {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function endOfMonth() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  return d.toISOString().split('T')[0]
}

/* ── API helpers ───────────────────────────────────────────────────────── */

const api = {
  get: () => fetch('/api/super-admin/items').then(r => r.json()),
  post: (data: Partial<Item>) => fetch('/api/super-admin/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  patch: (id: string, data: Partial<Item>) => fetch(`/api/super-admin/items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  del: (id: string) => fetch(`/api/super-admin/items/${id}`, { method: 'DELETE' }),
}

/* ── Calendar helpers ──────────────────────────────────────────────────── */

function buildCalendarDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return cells
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR = ['Lu','Ma','Me','Je','Ve','Sa','Di']

/* ── Main component ────────────────────────────────────────────────────── */

export default function WorkspacePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // Note state
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Link form
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')

  // Event/task form
  const [showEventForm, setShowEventForm] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState(today())
  const [newEventTime, setNewEventTime] = useState('')
  const [newEventType, setNewEventType] = useState('TASK')
  const [newEventHasDate, setNewEventHasDate] = useState(true)

  // Calendar state
  const now = new Date()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calFilter, setCalFilter] = useState<'today' | 'week' | 'month'>('week')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await api.get()
    setItems(data)
    const note = data.find((i: Item) => i.type === 'NOTE')
    if (note) setNoteContent(note.content ?? '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* ── Note autosave ─────────────────────────────────────────────────────── */
  const saveNote = useCallback(async (value: string) => {
    setNoteSaving(true)
    const note = items.find(i => i.type === 'NOTE')
    if (note) {
      await api.patch(note.id, { content: value })
    } else {
      const created = await api.post({ type: 'NOTE', title: 'Note', content: value })
      setItems(prev => [...prev, created])
    }
    setNoteSaving(false)
  }, [items])

  const handleNoteChange = (value: string) => {
    setNoteContent(value)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => saveNote(value), 1500)
  }

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const links = items.filter(i => i.type === 'LINK')
  const events = items.filter(i => i.type === 'EVENT' && i.date)
  const tasks = items.filter(i => i.type === 'TASK' || (i.type === 'EVENT' && !i.date))

  const filteredEvents = events.filter(e => {
    if (!e.date) return false
    if (calFilter === 'today') return e.date === today()
    if (calFilter === 'week') return e.date >= startOfWeek() && e.date <= endOfWeek()
    return e.date >= startOfMonth() && e.date <= endOfMonth()
  }).sort((a, b) => {
    const d = (a.date ?? '').localeCompare(b.date ?? '')
    return d !== 0 ? d : (a.time ?? '').localeCompare(b.time ?? '')
  })

  const calDays = buildCalendarDays(calYear, calMonth)
  const eventsByDay = events.reduce<Record<string, Item[]>>((acc, e) => {
    if (e.date) { acc[e.date] = [...(acc[e.date] ?? []), e] }
    return acc
  }, {})

  /* ── Actions ───────────────────────────────────────────────────────────── */
  async function addLink() {
    if (!newLinkTitle || !newLinkUrl) return
    const item = await api.post({ type: 'LINK', title: newLinkTitle, url: newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}` })
    setItems(prev => [...prev, item])
    setNewLinkTitle(''); setNewLinkUrl('')
  }

  async function addEvent() {
    if (!newEventTitle) return
    const item = await api.post({
      type: 'EVENT',
      title: newEventTitle,
      date: newEventHasDate ? newEventDate : undefined,
      time: newEventTime || undefined,
      eventType: newEventType,
      done: false,
    })
    setItems(prev => [...prev, item])
    setNewEventTitle(''); setNewEventTime(''); setShowEventForm(false)
  }

  async function toggleDone(item: Item) {
    const updated = await api.patch(item.id, { done: !item.done })
    setItems(prev => prev.map(i => i.id === item.id ? updated : i))
  }

  async function deleteItem(id: string) {
    await api.del(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <p className="p-6 text-[var(--pp-muted)]">Chargement...</p>

  const todayStr = today()
  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : []

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Mon espace de travail</h1>
        <p className="text-sm text-[var(--pp-muted)] mt-1">Notes, liens, agenda et tâches personnels</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Col gauche : Notes + Liens ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* Notes libres */}
          <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--pp-line)] bg-[var(--pp-bg2)]">
              <h2 className="font-semibold text-sm text-[var(--pp-ink)]">📝 Notes libres</h2>
              {noteSaving && <span className="text-[10px] text-[var(--pp-muted)]">Sauvegarde...</span>}
              {!noteSaving && noteContent && <span className="text-[10px] text-[#10b981]">Sauvegardé</span>}
            </div>
            <textarea
              value={noteContent}
              onChange={e => handleNoteChange(e.target.value)}
              placeholder="Tes notes, idées, choses à ne pas oublier..."
              className="w-full h-52 px-4 py-3 text-sm text-[var(--pp-ink)] bg-transparent resize-none focus:outline-none placeholder:text-[var(--pp-muted)]"
            />
          </div>

          {/* Liens rapides */}
          <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--pp-line)] bg-[var(--pp-bg2)]">
              <h2 className="font-semibold text-sm text-[var(--pp-ink)]">🔗 Liens rapides</h2>
            </div>
            <div className="px-4 py-3 space-y-2">
              {links.length === 0 && <p className="text-xs text-[var(--pp-muted)] italic">Aucun lien encore</p>}
              {links.map(link => (
                <div key={link.id} className="flex items-center gap-2 group">
                  <a href={link.url} target="_blank" rel="noreferrer" className="flex-1 text-sm text-[#6366f1] hover:underline truncate">
                    {link.title}
                  </a>
                  <button onClick={() => deleteItem(link.id)} className="opacity-0 group-hover:opacity-100 text-[#ef4444] text-xs px-1 transition-opacity">✕</button>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4 space-y-2 border-t border-[var(--pp-line)] pt-3">
              <input
                placeholder="Nom du lien"
                value={newLinkTitle}
                onChange={e => setNewLinkTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
              />
              <input
                placeholder="https://..."
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLink()}
                className="w-full px-3 py-1.5 text-sm border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
              />
              <button
                onClick={addLink}
                disabled={!newLinkTitle || !newLinkUrl}
                className="w-full py-1.5 text-xs font-semibold bg-[#6366f1] text-white rounded-lg hover:opacity-90 disabled:opacity-40"
              >
                + Ajouter
              </button>
            </div>
          </div>

          {/* Lien page comparaison */}
          <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg2)] px-4 py-3 text-sm">
            <p className="font-semibold text-[var(--pp-ink)] mb-2">🏷️ Page comparaison</p>
            <p className="text-xs text-[var(--pp-muted)] mb-2">Page cachée du menu — partager via email ou campagne</p>
            <div className="flex gap-2">
              <a href="/comparaison" target="_blank" className="text-xs text-[#6366f1] hover:underline">Voir la page →</a>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/comparaison`)}
                className="text-xs text-[var(--pp-muted)] hover:text-[var(--pp-ink)] border border-[var(--pp-line)] px-2 py-0.5 rounded-md"
              >
                Copier l'URL
              </button>
            </div>
          </div>
        </div>

        {/* ── Col droite (2/3) : Agenda + Tâches ────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Calendrier */}
          <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--pp-line)] bg-[var(--pp-bg2)] flex items-center justify-between">
              <h2 className="font-semibold text-sm text-[var(--pp-ink)]">📅 Agenda</h2>
              <button
                onClick={() => { setShowEventForm(v => !v); setNewEventHasDate(true) }}
                className="text-xs font-semibold px-3 py-1.5 bg-[#6366f1] text-white rounded-lg hover:opacity-90"
              >
                + Événement
              </button>
            </div>

            {showEventForm && (
              <div className="px-4 py-3 border-b border-[var(--pp-line)] bg-[#6366f1]/5 space-y-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    placeholder="Titre de l'événement"
                    value={newEventTitle}
                    onChange={e => setNewEventTitle(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  />
                  <select
                    value={newEventType}
                    onChange={e => setNewEventType(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] focus:outline-none"
                  >
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--pp-muted)] cursor-pointer">
                    <input type="checkbox" checked={newEventHasDate} onChange={e => setNewEventHasDate(e.target.checked)} className="rounded" />
                    Date
                  </label>
                  {newEventHasDate && (
                    <>
                      <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="px-2 py-1 text-sm border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)]" />
                      <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="px-2 py-1 text-sm border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] w-24" />
                    </>
                  )}
                  <button onClick={addEvent} disabled={!newEventTitle} className="ml-auto px-4 py-1.5 text-xs font-semibold bg-[#6366f1] text-white rounded-lg hover:opacity-90 disabled:opacity-40">
                    Ajouter
                  </button>
                  <button onClick={() => setShowEventForm(false)} className="text-xs text-[var(--pp-muted)] hover:text-[var(--pp-ink)]">Annuler</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-[var(--pp-line)]">

              {/* Mini calendrier */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()) }} className="p-1 rounded hover:bg-[var(--pp-bg2)] text-[var(--pp-muted)] hover:text-[var(--pp-ink)]">‹</button>
                  <span className="text-sm font-semibold text-[var(--pp-ink)]">{MONTHS_FR[calMonth]} {calYear}</span>
                  <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()) }} className="p-1 rounded hover:bg-[var(--pp-bg2)] text-[var(--pp-muted)] hover:text-[var(--pp-ink)]">›</button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {DAYS_FR.map(d => <div key={d} className="text-[10px] font-semibold text-[var(--pp-muted)] py-1">{d}</div>)}
                  {calDays.map((day, idx) => {
                    if (!day) return <div key={idx} />
                    const isToday = day === todayStr
                    const isSelected = day === selectedDay
                    const dayEvents = eventsByDay[day] ?? []
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`relative flex flex-col items-center py-1 rounded-lg text-xs transition-colors ${
                          isSelected ? 'bg-[#6366f1] text-white' :
                          isToday ? 'bg-[#6366f1]/15 text-[#6366f1] font-bold' :
                          'text-[var(--pp-muted)] hover:bg-[var(--pp-bg2)] hover:text-[var(--pp-ink)]'
                        }`}
                      >
                        {parseInt(day.split('-')[2])}
                        {dayEvents.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {dayEvents.slice(0, 3).map((e, i) => (
                              <div key={i} className="w-1 h-1 rounded-full" style={{ background: isSelected ? 'white' : eventColor(e.eventType) }} />
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {selectedDay && (
                  <div className="mt-3 pt-3 border-t border-[var(--pp-line)]">
                    <p className="text-xs font-semibold text-[var(--pp-ink)] mb-2">
                      {new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {selectedDayEvents.length === 0 ? (
                      <p className="text-xs text-[var(--pp-muted)] italic">Rien ce jour</p>
                    ) : (
                      <div className="space-y-1">
                        {selectedDayEvents.map(e => (
                          <div key={e.id} className="flex items-center gap-2 text-xs">
                            <span style={{ color: eventColor(e.eventType) }}>{eventLabel(e.eventType).split(' ')[0]}</span>
                            {e.time && <span className="text-[var(--pp-muted)] font-mono">{e.time}</span>}
                            <span className={`flex-1 ${e.done ? 'line-through text-[var(--pp-muted)]' : 'text-[var(--pp-ink)]'}`}>{e.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Liste filtrée */}
              <div className="p-4">
                <div className="flex gap-1 mb-3">
                  {(['today', 'week', 'month'] as const).map(f => (
                    <button key={f} onClick={() => { setCalFilter(f); setSelectedDay(null) }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${calFilter === f ? 'bg-[#6366f1] text-white' : 'text-[var(--pp-muted)] hover:text-[var(--pp-ink)] border border-[var(--pp-line)]'}`}
                    >
                      {f === 'today' ? "Aujourd'hui" : f === 'week' ? 'Semaine' : 'Mois'}
                    </button>
                  ))}
                </div>

                {filteredEvents.length === 0 ? (
                  <p className="text-xs text-[var(--pp-muted)] italic pt-2">Rien à cette période</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {filteredEvents.map(e => (
                      <div key={e.id} className={`flex items-start gap-2.5 p-2 rounded-lg group border ${e.done ? 'border-transparent opacity-50' : 'border-[var(--pp-line)]'}`}>
                        <input type="checkbox" checked={e.done} onChange={() => toggleDone(e)} className="mt-0.5 rounded shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px]" style={{ color: eventColor(e.eventType) }}>{eventLabel(e.eventType)}</span>
                            {e.time && <span className="text-[10px] font-mono text-[var(--pp-muted)]">{e.time}</span>}
                          </div>
                          <p className={`text-xs font-medium truncate ${e.done ? 'line-through text-[var(--pp-muted)]' : 'text-[var(--pp-ink)]'}`}>{e.title}</p>
                          {e.date && calFilter !== 'today' && (
                            <p className="text-[10px] text-[var(--pp-muted)]">
                              {new Date(e.date + 'T12:00:00').toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                          )}
                        </div>
                        <button onClick={() => deleteItem(e.id)} className="opacity-0 group-hover:opacity-100 text-[#ef4444] text-xs px-1 shrink-0 transition-opacity">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tâches sans date */}
          <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--pp-line)] bg-[var(--pp-bg2)]">
              <h2 className="font-semibold text-sm text-[var(--pp-ink)]">☑️ À faire (sans date)</h2>
              <span className="text-xs text-[var(--pp-muted)]">{tasks.filter(t => !t.done).length} en attente</span>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {tasks.length === 0 && <p className="text-xs text-[var(--pp-muted)] italic">Aucune tâche</p>}
              {tasks.map(t => (
                <div key={t.id} className={`flex items-center gap-2.5 p-2 rounded-lg group border ${t.done ? 'border-transparent opacity-50' : 'border-[var(--pp-line)]'}`}>
                  <input type="checkbox" checked={t.done} onChange={() => toggleDone(t)} className="rounded shrink-0" />
                  <span className={`flex-1 text-sm ${t.done ? 'line-through text-[var(--pp-muted)]' : 'text-[var(--pp-ink)]'}`}>{t.title}</span>
                  <button onClick={() => deleteItem(t.id)} className="opacity-0 group-hover:opacity-100 text-[#ef4444] text-xs px-1 shrink-0 transition-opacity">✕</button>
                </div>
              ))}
            </div>
            {/* Quick add task */}
            <div className="px-4 pb-4 border-t border-[var(--pp-line)] pt-3">
              <form onSubmit={async e => {
                e.preventDefault()
                const input = (e.target as HTMLFormElement).elements.namedItem('task') as HTMLInputElement
                if (!input.value.trim()) return
                const item = await api.post({ type: 'EVENT', title: input.value.trim(), eventType: 'TASK', done: false })
                setItems(prev => [...prev, item])
                input.value = ''
              }} className="flex gap-2">
                <input name="task" placeholder="Nouvelle tâche..." className="flex-1 px-3 py-1.5 text-sm border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] focus:outline-none focus:ring-1 focus:ring-[#6366f1]" />
                <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-[#6366f1] text-white rounded-lg hover:opacity-90">+</button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
