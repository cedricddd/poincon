'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { usePlan } from '@/hooks/usePlan'

type Site = { id: string; name: string }
type Manager = { id: string; name: string | null; email: string }
type User = { id: string; name: string; email: string; role: string; createdAt: string; defaultSiteId: string | null; defaultSite: Site | null; managerId: string | null; manager: Manager | null }
type EditState = { name: string; email: string; role: string; password: string; defaultSiteId: string; managerId: string }
type SortField = 'name' | 'email' | 'role' | 'site' | 'createdAt'
type SortDir = 'asc' | 'desc'

function PinModal({ user, onClose }: { user: User; onClose: () => void }) {
  const t = useTranslations('users')
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{4}$/.test(pin)) { setError(t('pinInvalid')); return }
    setSaving(true); setError(''); setMsg('')
    const res = await fetch(`/api/admin/users/${user.id}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? t('errorGeneric')); return }
    setMsg(t('pinSet')); setPin('')
  }

  const handleClear = async () => {
    if (!confirm(t('pinConfirmClear', { name: user.name }))) return
    setSaving(true); setError(''); setMsg('')
    const res = await fetch(`/api/admin/users/${user.id}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: null }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? t('errorGeneric')); return }
    setMsg(t('pinCleared'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-[var(--pp-bg)] rounded-2xl shadow-2xl p-6 w-80 border border-[var(--pp-line)]" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[var(--pp-ink)] mb-1">{t('pinTitle')}</h3>
        <p className="text-xs text-[var(--pp-muted)] mb-4">{user.name}</p>

        {msg && <p className="text-xs text-green-600 mb-3">{msg}</p>}
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <form onSubmit={handleSet} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
            placeholder={t('pinPlaceholder')}
            className="w-full px-4 py-3 text-center text-xl tracking-[0.5em] border border-[var(--pp-line)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
          />
          <Button type="submit" size="md" disabled={saving} className="w-full">
            {saving ? '…' : t('pinDefine')}
          </Button>
        </form>

        <div className="flex justify-between mt-3">
          <button onClick={handleClear} disabled={saving} className="text-xs text-[var(--pp-neg)] hover:underline">
            {t('pinDelete')}
          </button>
          <button onClick={onClose} className="text-xs text-[var(--pp-muted)] hover:underline">
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <span className="ml-1 text-[var(--pp-line)]">⇅</span>
  return <span className="ml-1 text-[var(--pp-info)]">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function UsersPage() {
  const t = useTranslations('users')
  const tc = useTranslations('common')
  const { planInfo } = usePlan()
  const [users, setUsers] = useState<User[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [canUseManagers, setCanUseManagers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditState>({ name: '', email: '', role: '', password: '', defaultSiteId: '', managerId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [pinUser, setPinUser] = useState<User | null>(null)

  const fetchUsers = () => {
    setLoading(true)
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setCanUseManagers(d.canUseManagers ?? false) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])
  useEffect(() => {
    fetch('/api/admin/sites')
      .then(r => r.ok ? r.json() : [])
      .then(d => setSites(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditData({ name: user.name, email: user.email, role: user.role, password: '', defaultSiteId: user.defaultSiteId ?? '', managerId: user.managerId ?? '' })
    setError('')
  }

  const cancelEdit = () => { setEditingId(null); setError('') }

  const saveEdit = async (id: string) => {
    setSaving(true)
    setError('')
    try {
      const body: Record<string, string | null> = {
        id,
        name: editData.name,
        email: editData.email,
        role: editData.role,
        defaultSiteId: editData.defaultSiteId || null,
        managerId: editData.managerId || null,
      }
      if (editData.password) body.password = editData.password
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setError((await res.json()).error); return }
      setEditingId(null)
      fetchUsers()
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(t('confirmDelete', { name }))) return
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { setError((await res.json()).error); return }
    fetchUsers()
  }

  const anonymizeUser = async (id: string, name: string) => {
    if (!confirm(t('confirmAnonymize', { name }))) return
    const res = await fetch('/api/admin/users/anonymize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    if (!res.ok) { setError((await res.json()).error); return }
    const data = await res.json()
    setError(t('anonymizeResult', { count: data.logsAnonymized, name }))
    setTimeout(() => setError(''), 4000)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    let va = '', vb = ''
    if (sortField === 'name') { va = a.name; vb = b.name }
    else if (sortField === 'email') { va = a.email; vb = b.email }
    else if (sortField === 'role') { va = a.role; vb = b.role }
    else if (sortField === 'site') { va = a.defaultSite?.name ?? ''; vb = b.defaultSite?.name ?? '' }
    else if (sortField === 'createdAt') { va = a.createdAt; vb = b.createdAt }
    const cmp = va.localeCompare(vb, 'fr')
    return sortDir === 'asc' ? cmp : -cmp
  })

  const thClass = 'pb-3 pr-4 font-medium cursor-pointer select-none hover:text-[var(--pp-ink)] whitespace-nowrap'
  const inp = 'w-full px-2 py-1 border border-[var(--pp-info)] rounded focus:outline-none text-sm'

  return (
    <div className="p-6 md:p-8">
      {pinUser && <PinModal user={pinUser} onClose={() => setPinUser(null)} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[var(--pp-muted)] text-sm">{t('accounts', { count: users.length })}</p>
            {planInfo && planInfo.maxEmployees !== -1 && (
              planInfo.plan === 'FREE' ? (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  users.length >= planInfo.maxEmployees
                    ? 'bg-red-100 text-red-700'
                    : users.length >= planInfo.maxEmployees * 0.8
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {t('freeUsage', { count: users.length, max: planInfo.maxEmployees })}
                </span>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  users.length > planInfo.maxEmployees ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'bg-gray-100 text-gray-500'
                }`}>
                  {t('seatUsage', { count: users.length, max: planInfo.maxEmployees })}
                  {users.length > planInfo.maxEmployees ? t('extraSeats', { count: users.length - planInfo.maxEmployees }) : ''}
                </span>
              )
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/dashboard/users/invite">
            <Button size="md" variant="mauve">{t('invite')}</Button>
          </Link>
          <Link href="/admin/dashboard/users/new">
            <Button size="md">{t('create')}</Button>
          </Link>
        </div>
      </div>

      {planInfo && planInfo.plan === 'FREE' && planInfo.maxEmployees !== -1 && users.length >= planInfo.maxEmployees && (
        <div className="mb-4 p-4 rounded-xl border border-orange-200 bg-orange-50 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-orange-800">{t('freeLimitTitle', { count: users.length, max: planInfo.maxEmployees })}</p>
            <p className="text-xs text-orange-600 mt-0.5">{t('freeLimitDesc')}</p>
          </div>
          <Link href="/pricing" className="shrink-0 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-lg hover:opacity-90">
            {t('upgrade')}
          </Link>
        </div>
      )}

      {planInfo && planInfo.plan !== 'FREE' && planInfo.maxEmployees !== -1 && users.length > planInfo.maxEmployees && (
        <div className="mb-4 p-4 rounded-xl border border-[#7c3aed]/20 bg-[#7c3aed]/5">
          <p className="text-sm text-[#7c3aed]">
            {t('seatsBillingPre', { count: users.length - planInfo.maxEmployees, max: planInfo.maxEmployees })}
            {t('seatsBillingDetail')}<Link href="/admin/dashboard/settings" className="underline font-medium">{t('settingsLink')}</Link>.
          </p>
        </div>
      )}

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full max-w-sm px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      <Card>
        {loading ? (
          <p className="text-[var(--pp-muted)] text-sm py-4 text-center">{t('loading')}</p>
        ) : users.length === 0 ? (
          <p className="text-[var(--pp-muted)] text-sm py-4 text-center">{t('empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                  <th className={thClass} onClick={() => toggleSort('name')}>
                    {t('colName')} <SortIcon field="name" current={sortField} dir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('email')}>
                    {t('colEmail')} <SortIcon field="email" current={sortField} dir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('role')}>
                    {t('colRole')} <SortIcon field="role" current={sortField} dir={sortDir} />
                  </th>
                  <th className={`${thClass} hidden md:table-cell`} onClick={() => toggleSort('site')}>
                    {t('colSite')} <SortIcon field="site" current={sortField} dir={sortDir} />
                  </th>
                  <th className="pb-3 pr-4 font-medium hidden lg:table-cell">{t('colManager')}</th>
                  <th className="pb-3 font-medium">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pp-line)]">
                {sorted.map(user => (
                  <tr key={user.id}>
                    {editingId === user.id ? (
                      <>
                        <td className="py-3 pr-4">
                          <input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} className={inp} />
                        </td>
                        <td className="py-3 pr-4">
                          <input type="email" value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} className={inp} />
                        </td>
                        <td className="py-3 pr-4">
                          <select value={editData.role} onChange={e => setEditData(p => ({ ...p, role: e.target.value }))} className="px-2 py-1 border border-[var(--pp-info)] rounded focus:outline-none text-sm bg-[var(--pp-bg)]">
                            <option value="EMPLOYEE">{tc('roleEmployee')}</option>
                            {canUseManagers && <option value="MANAGER">{tc('roleManager')}</option>}
                            <option value="ADMIN">{tc('roleAdmin')}</option>
                          </select>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell">
                          <select value={editData.defaultSiteId} onChange={e => setEditData(p => ({ ...p, defaultSiteId: e.target.value }))} className="px-2 py-1 border border-[var(--pp-info)] rounded focus:outline-none text-sm bg-[var(--pp-bg)]">
                            <option value="">{t('none')}</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </td>
                        <td className="py-3 pr-4 hidden lg:table-cell">
                          <select value={editData.managerId} onChange={e => setEditData(p => ({ ...p, managerId: e.target.value }))} className="px-2 py-1 border border-[var(--pp-info)] rounded focus:outline-none text-sm bg-[var(--pp-bg)]">
                            <option value="">{t('none')}</option>
                            {users.filter(u => u.role === 'MANAGER' && u.id !== user.id).map(m => (
                              <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="password"
                              placeholder={t('newPasswordPlaceholder')}
                              value={editData.password}
                              onChange={e => setEditData(p => ({ ...p, password: e.target.value }))}
                              className="px-2 py-1 border border-[var(--pp-line)] rounded focus:outline-none text-sm w-40"
                            />
                            <Button size="sm" onClick={() => saveEdit(user.id)} disabled={saving}>{saving ? '…' : t('save')}</Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>{t('cancel')}</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 pr-4 text-[var(--pp-ink)] font-medium">{user.name}</td>
                        <td className="py-3 pr-4 text-[var(--pp-muted)]">{user.email}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-[var(--pp-info)]/10 text-[var(--pp-info)]'
                              : user.role === 'MANAGER'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-[var(--pp-line)] text-[var(--pp-muted)]'
                          }`}>
                            {user.role === 'ADMIN' ? tc('roleAdmin') : user.role === 'MANAGER' ? tc('roleManager') : tc('roleEmployee')}
                          </span>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell text-xs text-[var(--pp-muted)]">
                          {user.defaultSite?.name ?? <span className="italic">—</span>}
                        </td>
                        <td className="py-3 pr-4 hidden lg:table-cell text-xs text-[var(--pp-muted)]">
                          {user.manager ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                              {user.manager.name ?? user.manager.email}
                            </span>
                          ) : <span className="italic">—</span>}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2 flex-wrap">
                            <Link href={`/admin/dashboard/users/${user.id}`}>
                              <Button size="sm" variant="outline">{t('view')}</Button>
                            </Link>
                            <Button size="sm" variant="outline" onClick={() => startEdit(user)}>{t('edit')}</Button>
                            <Button size="sm" variant="outline" onClick={() => setPinUser(user)} title={t('pinTitle')}>{t('pin')}</Button>
                            <button onClick={() => anonymizeUser(user.id, user.name)} className="text-xs text-[var(--pp-muted)] hover:underline px-2" title={t('anonymize')}>
                              {t('anonymize')}
                            </button>
                            <button onClick={() => deleteUser(user.id, user.name)} className="text-xs text-[var(--pp-neg)] hover:underline px-2">
                              {t('delete')}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
