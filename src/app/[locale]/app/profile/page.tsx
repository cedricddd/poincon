'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { downloadPersonalDataPdf } from '@/lib/personalDataPdf'

const LOCALE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
]

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

  const [emailLocale, setEmailLocale] = useState<string>('fr')
  const [localeLoading, setLocaleLoading] = useState(false)
  const [localeError, setLocaleError] = useState('')
  const [localeSuccess, setLocaleSuccess] = useState('')

  const [rgpdError, setRgpdError] = useState('')
  const [rgpdLoading, setRgpdLoading] = useState<'pdf' | 'json' | null>(null)

  // Admins and managers: one e-mail per new employee request (opt-in)
  const [canReview, setCanReview] = useState(false)
  const [emailOnRequests, setEmailOnRequests] = useState(false)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsMsg, setPrefsMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/user/locale')
      .then(r => r.json())
      .then(data => {
        if (data.locale) setEmailLocale(data.locale)
      })
      .catch(() => {})
    fetch('/api/user/notification-prefs')
      .then(r => r.json())
      .then(data => {
        setCanReview(Boolean(data.canReview))
        setEmailOnRequests(Boolean(data.emailOnRequests))
      })
      .catch(() => {})
  }, [])

  const toggleEmailOnRequests = async (value: boolean) => {
    // The box follows the click at once, and goes back if saving fails
    setEmailOnRequests(value)
    setPrefsSaving(true)
    setPrefsMsg(null)
    try {
      const res = await fetch('/api/user/notification-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOnRequests: value }),
      })
      if (!res.ok) throw new Error()
      setPrefsMsg({ ok: true, text: value ? t('requestEmailsOn') : t('requestEmailsOff') })
    } catch {
      setEmailOnRequests(!value)
      setPrefsMsg({ ok: false, text: tc('error') })
    } finally {
      setPrefsSaving(false)
    }
  }

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

  const handleLocaleSave = async () => {
    setLocaleError('')
    setLocaleSuccess('')
    setLocaleLoading(true)
    try {
      const res = await fetch('/api/user/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: emailLocale }),
      })
      if (!res.ok) {
        setLocaleError(t('emailLocaleError'))
      } else {
        setLocaleSuccess(t('emailLocaleSuccess'))
      }
    } catch {
      setLocaleError(t('emailLocaleError'))
    } finally {
      setLocaleLoading(false)
    }
  }

  const role = (session?.user as { role?: string } | undefined)?.role ?? ''

  const handleRgpdDownload = async (format: 'pdf' | 'json') => {
    setRgpdError('')
    setRgpdLoading(format)
    try {
      const res = await fetch('/api/user/export')
      if (!res.ok) {
        setRgpdError(t('rgpdError'))
        return
      }
      if (format === 'json') {
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `pointon-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
      } else {
        const data = await res.json()
        await downloadPersonalDataPdf(data)
      }
    } catch {
      setRgpdError(t('rgpdError'))
    } finally {
      setRgpdLoading(null)
    }
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>

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

      <Card>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('emailLocale')}</h2>

          {localeError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{localeError}</div>
          )}
          {localeSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">{localeSuccess}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">{t('emailLocaleLabel')}</label>
            <select
              value={emailLocale}
              onChange={e => { setEmailLocale(e.target.value); setLocaleSuccess('') }}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-surface)] text-[var(--pp-ink)]"
            >
              {LOCALE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <Button type="button" onClick={handleLocaleSave} disabled={localeLoading} size="md">
            {localeLoading ? t('submitting') : t('emailLocaleSave')}
          </Button>
        </div>
      </Card>

      {canReview && (
        <Card>
          <div className="space-y-3" data-testid="request-emails">
            <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('requestEmailsTitle')}</h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailOnRequests}
                disabled={prefsSaving}
                onChange={e => toggleEmailOnRequests(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--pp-info)]"
              />
              <span className="text-sm text-[var(--pp-ink)]">{t('requestEmailsLabel')}</span>
            </label>
            <p className="text-xs text-[var(--pp-muted)]">{t('requestEmailsHint')}</p>
            {prefsMsg && (
              <p className={`text-xs ${prefsMsg.ok ? 'text-[var(--pp-pos)]' : 'text-[var(--pp-neg)]'}`}>{prefsMsg.text}</p>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--pp-ink)]">{t('rgpdTitle')}</h2>
          <p className="text-sm text-[var(--pp-muted)]">{t('rgpdDescription')}</p>

          {rgpdError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{rgpdError}</div>
          )}

          <div className="flex gap-3">
            <Button type="button" onClick={() => handleRgpdDownload('pdf')} disabled={rgpdLoading !== null} size="md">
              {rgpdLoading === 'pdf' ? t('rgpdGenerating') : t('rgpdDownloadPdf')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleRgpdDownload('json')} disabled={rgpdLoading !== null} size="md">
              {rgpdLoading === 'json' ? t('rgpdGenerating') : t('rgpdDownloadJson')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
