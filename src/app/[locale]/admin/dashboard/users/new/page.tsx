'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

type Site = { id: string; name: string }

export default function NewUserPage() {
  const t = useTranslations('usersForm')
  const tc = useTranslations('common')
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    defaultSiteId: '',
  })
  const [sites, setSites] = useState<Site[]>([])
  const [canUseManagers, setCanUseManagers] = useState(false)

  useEffect(() => {
    fetch('/api/admin/sites')
      .then(r => r.ok ? r.json() : [])
      .then(data => setSites(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetch('/api/admin/users')
      .then(r => r.ok ? r.json() : {})
      .then(d => setCanUseManagers(d.canUseManagers ?? false))
      .catch(() => {})
  }, [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(formData.defaultSiteId && { defaultSiteId: formData.defaultSiteId }),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || t('error'))
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/admin/dashboard'), 1500)
    } catch {
      setError(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
        <p className="text-[var(--pp-muted)] text-sm mt-1">
          {t('subtitle')}
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {t('success')}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
              {t('fullName')}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('placeholderName')}
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
              {t('email')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('placeholderEmail')}
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
              {t('tempPassword')}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
              {t('role')}
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
            >
              <option value="EMPLOYEE">{tc('roleEmployee')}</option>
              {canUseManagers && <option value="MANAGER">{tc('roleManager')}</option>}
              <option value="ADMIN">{tc('roleAdmin')}</option>
            </select>
          </div>

          {sites.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
                {t('defaultSite')}
              </label>
              <select
                name="defaultSiteId"
                value={formData.defaultSiteId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
              >
                <option value="">{t('noSite')}</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || success} size="md">
              {loading ? t('creating') : t('createAccount')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => router.push('/admin/dashboard/users')}
            >
              {t('cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
