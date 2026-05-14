'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

type Site = { id: string; name: string }
type User = { id: string; name: string; email: string; role: string; createdAt: string; defaultSiteId: string | null; defaultSite: Site | null }
type EditState = { name: string; email: string; role: string; password: string; defaultSiteId: string }
type SortField = 'name' | 'email' | 'role' | 'site' | 'createdAt'
type SortDir = 'asc' | 'desc'

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <span className="ml-1 text-[var(--pp-line)]">⇅</span>
  return <span className="ml-1 text-[var(--pp-info)]">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditState>({ name: '', email: '', role: '', password: '', defaultSiteId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const fetchUsers = () => {
    setLoading(true)
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
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
    setEditData({ name: user.name, email: user.email, role: user.role, password: '', defaultSiteId: user.defaultSiteId ?? '' })
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
    if (!confirm(`Supprimer le compte de ${name} ? Cette action est irréversible.`)) return
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { setError((await res.json()).error); return }
    fetchUsers()
  }

  const anonymizeUser = async (id: string, name: string) => {
    if (!confirm(`Anonymiser les logs d'audit de ${name} ?\n\nLeurs actions passées seront conservées mais dissociées de leur identité. Action irréversible.`)) return
    const res = await fetch('/api/admin/users/anonymize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    if (!res.ok) { setError((await res.json()).error); return }
    const data = await res.json()
    setError(`✓ ${data.logsAnonymized} log(s) anonymisé(s) pour ${name}`)
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Utilisateurs</h1>
          <p className="text-[var(--pp-muted)] text-sm mt-1">{users.length} compte{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/dashboard/users/invite">
            <Button size="md" variant="mauve">Inviter</Button>
          </Link>
          <Link href="/admin/dashboard/users/new">
            <Button size="md">Créer</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="w-full max-w-sm px-3 py-2 border border-[var(--pp-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      <Card>
        {loading ? (
          <p className="text-[var(--pp-muted)] text-sm py-4 text-center">Chargement…</p>
        ) : users.length === 0 ? (
          <p className="text-[var(--pp-muted)] text-sm py-4 text-center">Aucun utilisateur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pp-line)] text-left text-[var(--pp-muted)]">
                  <th className={thClass} onClick={() => toggleSort('name')}>
                    Nom <SortIcon field="name" current={sortField} dir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('email')}>
                    Email <SortIcon field="email" current={sortField} dir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('role')}>
                    Rôle <SortIcon field="role" current={sortField} dir={sortDir} />
                  </th>
                  <th className={`${thClass} hidden md:table-cell`} onClick={() => toggleSort('site')}>
                    Site <SortIcon field="site" current={sortField} dir={sortDir} />
                  </th>
                  <th className="pb-3 font-medium">Actions</th>
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
                            <option value="EMPLOYEE">Employé</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell">
                          <select value={editData.defaultSiteId} onChange={e => setEditData(p => ({ ...p, defaultSiteId: e.target.value }))} className="px-2 py-1 border border-[var(--pp-info)] rounded focus:outline-none text-sm bg-[var(--pp-bg)]">
                            <option value="">— Aucun —</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="password"
                              placeholder="Nouveau mdp (optionnel)"
                              value={editData.password}
                              onChange={e => setEditData(p => ({ ...p, password: e.target.value }))}
                              className="px-2 py-1 border border-[var(--pp-line)] rounded focus:outline-none text-sm w-40"
                            />
                            <Button size="sm" onClick={() => saveEdit(user.id)} disabled={saving}>{saving ? '…' : 'Sauver'}</Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>Annuler</Button>
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
                              : 'bg-[var(--pp-line)] text-[var(--pp-muted)]'
                          }`}>
                            {user.role === 'ADMIN' ? 'Admin' : 'Employé'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell text-xs text-[var(--pp-muted)]">
                          {user.defaultSite?.name ?? <span className="italic">—</span>}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2 flex-wrap">
                            <Link href={`/admin/dashboard/users/${user.id}`}>
                              <Button size="sm" variant="outline">Voir</Button>
                            </Link>
                            <Button size="sm" variant="outline" onClick={() => startEdit(user)}>Modifier</Button>
                            <button onClick={() => anonymizeUser(user.id, user.name)} className="text-xs text-[var(--pp-muted)] hover:underline px-2" title="Anonymiser les logs RGPD">
                              Anonymiser
                            </button>
                            <button onClick={() => deleteUser(user.id, user.name)} className="text-xs text-[var(--pp-neg)] hover:underline px-2">
                              Supprimer
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
