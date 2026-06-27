'use client'

export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

export default function ProfilePage() {
  const { data: session } = useSession()
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const roleLabel: Record<string, string> = {
    EMPLOYEE: tc('roleEmployee'),
    MANAGER: tc('roleManager'),
    ADMIN: tc('roleAdmin'),
    SUPER_ADMIN: tc('roleSuperAdmin'),
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (newPassword !== confirmPassword) {
      setError(t('errMismatch'))
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('errUpdate'))
      } else {
        setSuccess(t('success'))
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setError(t('errNetwork'))
    } finally {
      setLoading(false)
    }
  }

  const role = (session?.user as { role?: string } | undefined)?.role ?? ''

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-[var(--pp-ink)] mb-6">{t('title')}</h1>

      <Card>
        <div className="mb-6 pb-6 border-b border-[var(--pp-line)]">
          <p className="text-sm text-[var(--pp-muted)] mb-1">{t('account')}</p>
          <p className="font-medium text-[var(--pp-ink)]">{session?.user?.name}</p>
          <p className="text-sm text-[var(--pp-muted)]">{session?.user?.email}</p>
          {role && (
            <span className="inline-block mt-2 px-2 py-0.5 bg-[var(--pp-line)] text-[var(--pp-muted)] text-xs font-semibold rounded">
              {roleLabel[role] ?? role}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('changePassword')}</h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">{success}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">{t('currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">{t('newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
            <p className="text-xs text-[var(--pp-muted)] mt-1">{t('minChars')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">{t('confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>

          <Button type="submit" disabled={loading} size="md">
            {loading ? t('submitting') : t('submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
